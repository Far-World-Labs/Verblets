import { describe, it, expect } from 'vitest';
import { normalizeInstruction, resolveArgs, resolveTexts } from './index.js';

describe('normalizeInstruction', () => {
  it('wraps a string in { text }', () => {
    expect(normalizeInstruction('hello')).toEqual({ text: 'hello' });
  });

  it('calls .build() on template builders', () => {
    const builder = { build: () => 'rendered text' };
    expect(normalizeInstruction(builder)).toEqual({ text: 'rendered text' });
  });

  it('passes through an object with text property', () => {
    const instruction = { text: 'hello', domain: 'finance' };
    expect(normalizeInstruction(instruction)).toBe(instruction);
  });

  it('returns { text: undefined } for undefined', () => {
    expect(normalizeInstruction(undefined)).toEqual({ text: undefined });
  });

  it('throws on null', () => {
    expect(() => normalizeInstruction(null)).toThrow(/null is not allowed/);
  });
});

describe('resolveArgs', () => {
  it('passes through string instructions unchanged', () => {
    expect(resolveArgs('do X', { batch: 5 })).toEqual(['do X', { batch: 5 }]);
  });

  it('passes through instruction bundle with text', () => {
    const bundle = { text: 'do X', domain: 'finance' };
    expect(resolveArgs(bundle, { batch: 5 })).toEqual([bundle, { batch: 5 }]);
  });

  it('passes through template builder', () => {
    const builder = { build: () => 'rendered' };
    expect(resolveArgs(builder)).toEqual([builder, {}]);
  });

  it('shifts config-like object to config when config is absent', () => {
    const [instructions, config] = resolveArgs({ chunkSize: 500, maxParallel: 2 });
    expect(instructions).toBeUndefined();
    expect(config).toEqual({ chunkSize: 500, maxParallel: 2 });
  });

  it('does not shift when explicit config is present', () => {
    const obj = { chunkSize: 500 };
    expect(resolveArgs(obj, { batch: 5 })).toEqual([obj, { batch: 5 }]);
  });

  it('passes through undefined instructions', () => {
    expect(resolveArgs(undefined, { batch: 5 })).toEqual([undefined, { batch: 5 }]);
  });

  it('defaults config to empty object when both are absent', () => {
    expect(resolveArgs(undefined)).toEqual([undefined, {}]);
  });

  it('does not shift arrays', () => {
    const arr = ['a', 'b'];
    expect(resolveArgs(arr)).toEqual([arr, {}]);
  });

  it('throws on null instructions', () => {
    expect(() => resolveArgs(null, { x: 1 })).toThrow(/null is not allowed/);
  });

  it('keeps object with a known instruction key as instructions', () => {
    const bundle = { vocabulary: { tags: [] } };
    const [instructions, config] = resolveArgs(bundle, undefined, ['spec', 'vocabulary']);
    expect(instructions).toBe(bundle);
    expect(config).toEqual({});
  });

  it('shifts object to config when no known keys match', () => {
    const [instructions, config] = resolveArgs({ batchSize: 5 }, undefined, ['spec', 'vocabulary']);
    expect(instructions).toBeUndefined();
    expect(config).toEqual({ batchSize: 5 });
  });

  it('ignores knownKeys when text is already present', () => {
    const bundle = { text: 'do X', vocabulary: { tags: [] } };
    expect(resolveArgs(bundle, undefined, ['vocabulary'])).toEqual([bundle, {}]);
  });
});

describe('resolveTexts', () => {
  it('returns text and empty known/context for a string instruction', () => {
    const result = resolveTexts('hello');
    expect(result.text).toBe('hello');
    expect(result.known).toEqual({});
    expect(result.context).toBe('');
  });

  it('separates known keys from unknown keys', () => {
    const result = resolveTexts({ text: 'do the thing', spec: 'my spec', domain: 'finance' }, [
      'spec',
    ]);
    expect(result.text).toBe('do the thing');
    expect(result.known).toEqual({ spec: 'my spec' });
    expect(result.context).toContain('<domain>');
    expect(result.context).toContain('finance');
    expect(result.context).not.toContain('spec');
  });

  it('renders multiple unknown keys as separate XML blocks', () => {
    const result = resolveTexts(
      { text: 'instruction', domain: 'finance', audience: 'board members' },
      []
    );
    expect(result.context).toContain('<domain>');
    expect(result.context).toContain('<audience>');
    expect(result.context).toContain('finance');
    expect(result.context).toContain('board members');
  });

  it('calls .build() on template builder values', () => {
    const builder = { build: () => 'built spec text' };
    const result = resolveTexts({ text: 'instruction', spec: builder }, ['spec']);
    expect(result.known.spec).toBe('built spec text');
  });

  it('calls .build() on unknown-key template builder values', () => {
    const builder = { build: () => 'built context' };
    const result = resolveTexts({ text: 'instruction', extra: builder }, []);
    expect(result.context).toContain('built context');
    expect(result.context).toContain('<extra>');
  });

  it('returns empty context when all keys are known', () => {
    const result = resolveTexts({ text: 'instruction', spec: 'my spec', anchors: 'my anchors' }, [
      'spec',
      'anchors',
    ]);
    expect(result.context).toBe('');
    expect(result.known.spec).toBe('my spec');
    expect(result.known.anchors).toBe('my anchors');
  });

  it('handles string instruction with known keys (no-op — no extra keys)', () => {
    const result = resolveTexts('just a string', ['spec']);
    expect(result.text).toBe('just a string');
    expect(result.known).toEqual({});
    expect(result.context).toBe('');
  });

  it('renders name-text pair arrays as nested XML', () => {
    const result = resolveTexts(
      {
        text: 'Summarize each item',
        references: [
          { name: 'glossary', text: 'EBITDA: earnings before interest' },
          { name: 'prior-analysis', text: 'Q3 showed declining margins' },
        ],
      },
      []
    );
    expect(result.context).toContain('<references>');
    expect(result.context).toContain('</references>');
    expect(result.context).toContain('<glossary>');
    expect(result.context).toContain('EBITDA: earnings before interest');
    expect(result.context).toContain('<prior-analysis>');
    expect(result.context).toContain('Q3 showed declining margins');
  });

  it('mixes name-text pairs with scalar unknown keys', () => {
    const result = resolveTexts(
      {
        text: 'instruction',
        domain: 'finance',
        references: [{ name: 'terms', text: 'ROI: return on investment' }],
      },
      []
    );
    expect(result.context).toContain('<domain>');
    expect(result.context).toContain('finance');
    expect(result.context).toContain('<references>');
    expect(result.context).toContain('<terms>');
  });

  it('treats name-text pairs on known keys as regular values (not XML)', () => {
    const pairs = [{ name: 'a', text: 'hello' }];
    const result = resolveTexts({ text: 'instruction', spec: pairs }, ['spec']);
    // Known keys preserve original value — chain decides how to use it
    expect(result.known.spec).toBe(pairs);
    expect(result.context).toBe('');
  });
});
