import { describe, it, expect, vi } from 'vitest';
import ContextBudget from './index.js';

// Minimal model stub: 1 token per 4 chars (matches FALLBACK_TOKENS_PER_CHAR)
const makeModel = () => ({
  toTokens: (text) => new Array(Math.ceil(text.length / 4)),
});

describe('ContextBudget', () => {
  describe('without budget', () => {
    it('XML-wraps and joins entries', () => {
      const budget = new ContextBudget();
      budget.set('domain', 'SEC filings');
      budget.set('audience', 'Board members');

      const result = budget.build();
      expect(result).toContain('<domain>');
      expect(result).toContain('SEC filings');
      expect(result).toContain('</domain>');
      expect(result).toContain('<audience>');
      expect(result).toContain('Board members');
      expect(result).toContain('</audience>');
      // Entries separated by double newline
      expect(result).toMatch(/<\/domain>\n\n<audience>/);
    });

    it('returns empty string with no entries', () => {
      const budget = new ContextBudget();
      expect(budget.build()).toBe('');
    });

    it('skips nullish and empty values', () => {
      const budget = new ContextBudget();
      budget.set('a', null);
      budget.set('b', undefined);
      budget.set('c', '');
      budget.set('d', 'kept');

      const result = budget.build();
      expect(result).toContain('<d>');
      expect(result).toContain('kept');
      expect(result).not.toContain('<a>');
      expect(result).not.toContain('<b>');
      expect(result).not.toContain('<c>');
    });

    it('passes raw entries through without wrapping', () => {
      const budget = new ContextBudget();
      budget.set('pre-wrapped', '<custom>already formatted</custom>', { raw: true });
      budget.set('normal', 'plain text');

      const result = budget.build();
      expect(result).toContain('<custom>already formatted</custom>');
      expect(result).toContain('<normal>');
      expect(result).toContain('plain text');
    });
  });

  describe('with budget', () => {
    it('passes entries through when they fit within budget', () => {
      const model = makeModel();
      // 'short text' = 10 chars = ~3 tokens. Budget of 100 is more than enough.
      const budget = new ContextBudget({ targetTokens: 100, model });
      budget.set('note', 'short text');

      const result = budget.build();
      expect(result).toContain('<note>');
      expect(result).toContain('short text');
      expect(result).toContain('</note>');
    });

    it('trims entries that exceed proportional budget', () => {
      const model = makeModel();
      // Long text: 400 chars = 100 tokens. Budget of 20 forces trimming.
      const longText = 'a'.repeat(400);
      const budget = new ContextBudget({ targetTokens: 20, model });
      budget.set('doc', longText);

      const result = budget.build();
      // shorten-text produces a shorter result with '...' ellipsis
      expect(result).toContain('...');
      expect(result.length).toBeLessThan(longText.length + 20); // +20 for XML tags
    });

    it('allocates proportionally by weight * length', () => {
      const model = makeModel();
      const text200 = 'x'.repeat(200);
      const text100 = 'y'.repeat(100);
      const onTrim = vi.fn();
      // Total budget: 30 tokens. text200 (w=1): gets 200/300 * 30 = 20 tokens.
      // text100 (w=1): gets 100/300 * 30 = 10 tokens.
      const budget = new ContextBudget({ targetTokens: 30, model, onTrim });
      budget.set('large', text200);
      budget.set('small', text100);

      budget.build();

      // Both should be trimmed since 200 chars = 50 tokens > 20, and 100 chars = 25 tokens > 10
      expect(onTrim).toHaveBeenCalledTimes(2);
      const [largeCall, smallCall] = onTrim.mock.calls.map((c) => c[0]);
      expect(largeCall.tag).toBe('large');
      expect(smallCall.tag).toBe('small');
      expect(largeCall.originalTokens).toBeGreaterThan(largeCall.trimmedTokens);
      expect(smallCall.originalTokens).toBeGreaterThan(smallCall.trimmedTokens);
    });

    it('higher weight gets proportionally more budget', () => {
      const model = makeModel();
      const textA = 'a'.repeat(200);
      const textB = 'b'.repeat(200);
      const onTrim = vi.fn();
      // weight=3 entry: 200*3 = 600 sizeWeight of total 800. Gets 600/800 * 40 = 30 tokens.
      // weight=1 entry: 200*1 = 200 sizeWeight of total 800. Gets 200/800 * 40 = 10 tokens.
      const budget = new ContextBudget({ targetTokens: 40, model, onTrim });
      budget.set('important', textA, { weight: 3 });
      budget.set('minor', textB, { weight: 1 });

      budget.build();

      expect(onTrim).toHaveBeenCalledTimes(2);
      const calls = Object.fromEntries(onTrim.mock.calls.map((c) => [c[0].tag, c[0]]));
      // Important entry kept more of its content
      expect(calls.important.ratio).toBeGreaterThan(calls.minor.ratio);
    });

    it('does not trim entries that fit their proportional budget', () => {
      const model = makeModel();
      const onTrim = vi.fn();
      // 'hi' = 2 chars = 1 token. Budget of 100 — easily fits.
      const budget = new ContextBudget({ targetTokens: 100, model, onTrim });
      budget.set('small', 'hi');

      budget.build();
      expect(onTrim).not.toHaveBeenCalled();
    });

    it('falls back to unwrapped assembly when model has no toTokens', () => {
      const budget = new ContextBudget({ targetTokens: 10, model: {} });
      budget.set('note', 'text');

      // No toTokens → no trimming, just XML assembly
      const result = budget.build();
      expect(result).toContain('<note>');
      expect(result).toContain('text');
    });
  });

  describe('onTrim telemetry', () => {
    it('reports strategy, token counts, budget, and ratio for token trimming', () => {
      const model = makeModel();
      const onTrim = vi.fn();
      const budget = new ContextBudget({ targetTokens: 5, model, onTrim });
      budget.set('doc', 'a'.repeat(200));

      budget.build();

      expect(onTrim).toHaveBeenCalledTimes(1);
      const report = onTrim.mock.calls[0][0];
      expect(report.tag).toBe('doc');
      expect(report.strategy).toBe('middle-trim');
      expect(report.originalTokens).toBe(50); // 200 chars / 4
      expect(report.trimmedTokens).toBeLessThanOrEqual(5);
      expect(report.budgetTokens).toBe(5);
      expect(report.ratio).toBeLessThan(1);
      expect(typeof report.ratio).toBe('number');
    });

    it('reports budgetChars for char trimming', () => {
      const onTrim = vi.fn();
      const budget = new ContextBudget({ targetChars: 50, onTrim });
      budget.set('doc', 'a'.repeat(200));

      budget.build();

      expect(onTrim).toHaveBeenCalledTimes(1);
      const report = onTrim.mock.calls[0][0];
      expect(report.strategy).toBe('char-trim');
      expect(report.budgetChars).toBe(50);
    });
  });

  describe('trimToEmitter', () => {
    it('routes trim telemetry into emitter.emit as DomainEvent.step', () => {
      const emit = vi.fn();
      const emitter = { emit };
      const model = makeModel();

      const budget = new ContextBudget({
        targetTokens: 5,
        model,
        onTrim: ContextBudget.trimToEmitter(emitter),
      });
      budget.set('doc', 'a'.repeat(200));
      budget.build();

      expect(emit).toHaveBeenCalledTimes(1);
      const event = emit.mock.calls[0][0];
      expect(event.stepName).toBe('context-trim');
      expect(event.tag).toBe('doc');
      expect(event.strategy).toBe('middle-trim');
      expect(event.budgetTokens).toBe(5);
    });
  });

  describe('char-based budget', () => {
    it('trims entries proportionally by character count', () => {
      const onTrim = vi.fn();
      const budget = new ContextBudget({ targetChars: 50, onTrim });
      budget.set('doc', 'a'.repeat(200));

      const result = budget.build();
      // Result should contain ellipsis from middle truncation
      expect(result).toContain('...');
      // XML wrapping adds chars, but inner value should be ~50 chars
      const innerMatch = result.match(/<doc>\n([\s\S]*?)\n<\/doc>/);
      expect(innerMatch[1].length).toBeLessThanOrEqual(60); // ~50 + ellipsis

      expect(onTrim).toHaveBeenCalledTimes(1);
      const report = onTrim.mock.calls[0][0];
      expect(report.tag).toBe('doc');
      expect(report.strategy).toBe('char-trim');
      expect(report.originalChars).toBe(200);
      expect(report.trimmedChars).toBeLessThan(200);
      expect(report.ratio).toBeLessThan(1);
    });

    it('does not trim entries that fit their proportional budget', () => {
      const onTrim = vi.fn();
      const budget = new ContextBudget({ targetChars: 500, onTrim });
      budget.set('note', 'short');

      budget.build();
      expect(onTrim).not.toHaveBeenCalled();
    });

    it('allocates proportionally by weight * length', () => {
      const onTrim = vi.fn();
      const budget = new ContextBudget({ targetChars: 100, onTrim });
      budget.set('important', 'a'.repeat(200), { weight: 3 });
      budget.set('minor', 'b'.repeat(200), { weight: 1 });

      budget.build();

      expect(onTrim).toHaveBeenCalledTimes(2);
      const calls = Object.fromEntries(onTrim.mock.calls.map((c) => [c[0].tag, c[0]]));
      expect(calls.important.ratio).toBeGreaterThan(calls.minor.ratio);
    });

    it('prefers token budget over char budget when both provided with model', () => {
      const model = makeModel();
      const onTrim = vi.fn();
      // Both provided, but model available → token path wins
      const budget = new ContextBudget({ targetTokens: 5, targetChars: 5000, model, onTrim });
      budget.set('doc', 'a'.repeat(200));

      budget.build();

      expect(onTrim).toHaveBeenCalledTimes(1);
      expect(onTrim.mock.calls[0][0].strategy).toBe('middle-trim');
    });

    it('falls back to char budget when model lacks toTokens', () => {
      const onTrim = vi.fn();
      const budget = new ContextBudget({ targetTokens: 5, targetChars: 50, model: {}, onTrim });
      budget.set('doc', 'a'.repeat(200));

      budget.build();

      expect(onTrim).toHaveBeenCalledTimes(1);
      expect(onTrim.mock.calls[0][0].strategy).toBe('char-trim');
    });
  });

  describe('mutation', () => {
    it('set returns this for chaining', () => {
      const budget = new ContextBudget();
      const returned = budget.set('a', 'x').set('b', 'y');
      expect(returned).toBe(budget);
      expect(budget.size).toBe(2);
    });

    it('delete removes an entry', () => {
      const budget = new ContextBudget();
      budget.set('a', 'x');
      budget.set('b', 'y');
      budget.delete('a');

      expect(budget.size).toBe(1);
      const result = budget.build();
      expect(result).toContain('<b>');
      expect(result).not.toContain('<a>');
    });

    it('overwriting a key replaces the entry', () => {
      const budget = new ContextBudget();
      budget.set('a', 'first');
      budget.set('a', 'second');

      expect(budget.size).toBe(1);
      const result = budget.build();
      expect(result).toContain('second');
      expect(result).not.toContain('first');
    });
  });
});
