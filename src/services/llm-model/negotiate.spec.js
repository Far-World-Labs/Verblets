import { beforeEach, describe, expect, it } from 'vitest';
import modelService, { resolveModel } from './index.js';
import Model from './model.js';

describe('Rule-based model negotiation', () => {
  beforeEach(() => {
    modelService._modelCache.clear();
    modelService.customModels = {};
    modelService.gatedCapabilities = new Set(['sensitive', 'reasoning']);

    // Custom models simulate the catalog for tests
    modelService.addModels({
      'fast-default': { maxContextWindow: 128000, maxOutputTokens: 16384, requestTimeout: 1000 },
      'budget-model': { maxContextWindow: 128000, maxOutputTokens: 16384, requestTimeout: 1000 },
      'reasoning-model': { maxContextWindow: 128000, maxOutputTokens: 16384, requestTimeout: 1000 },
      'sensitive-default': {
        maxContextWindow: 128000,
        maxOutputTokens: 16384,
        requestTimeout: 1000,
      },
      'sensitive-good': { maxContextWindow: 128000, maxOutputTokens: 16384, requestTimeout: 1000 },
    });

    modelService.setRules([
      { match: { sensitive: true, good: true }, use: 'sensitive-good' },
      { match: { sensitive: true }, use: 'sensitive-default' },
      { match: { reasoning: true }, use: 'reasoning-model' },
      { match: { cheap: true, good: false }, use: 'budget-model' },
      { use: 'fast-default' }, // catch-all
    ]);
  });

  // ── Rule matching basics ──────────────────────────────────────────

  describe('Basic rule matching', () => {
    it('returns the catch-all model with empty negotiation', () => {
      const result = modelService.negotiateModel(undefined, {});
      expect(result.name).toBe('fast-default');
    });

    it('returns the catch-all model with undefined negotiation', () => {
      const result = modelService.negotiateModel(undefined);
      expect(result.name).toBe('fast-default');
    });

    it('matches a rule requiring cheap: true and good: false', () => {
      const result = modelService.negotiateModel(undefined, { cheap: true, good: false });
      expect(result.name).toBe('budget-model');
    });

    it('falls through to catch-all when no specific rule matches', () => {
      const result = modelService.negotiateModel(undefined, { fast: true });
      expect(result.name).toBe('fast-default');
    });

    it('first matching rule wins (order matters)', () => {
      // sensitive + good matches the first sensitive rule, not the second
      const result = modelService.negotiateModel(undefined, { sensitive: true, good: true });
      expect(result.name).toBe('sensitive-good');
    });

    it('sensitive: true without good matches the second sensitive rule', () => {
      const result = modelService.negotiateModel(undefined, { sensitive: true });
      expect(result.name).toBe('sensitive-default');
    });
  });

  // ── Gating ────────────────────────────────────────────────────────

  describe('Gating', () => {
    it('catch-all rule is skipped when consumer hard-requires a gated cap', () => {
      // reasoning: true is gated — catch-all doesn't mention it, so it's skipped
      const result = modelService.negotiateModel(undefined, { reasoning: true });
      expect(result.name).toBe('reasoning-model');
    });

    it('sensitive: true prevents fallthrough to catch-all', () => {
      const result = modelService.negotiateModel(undefined, { sensitive: true });
      expect(result.name).toBe('sensitive-default');
    });

    it('returns undefined when gated cap required but no rule addresses it', () => {
      // Remove all sensitive rules
      modelService.setRules([
        { match: { reasoning: true }, use: 'reasoning-model' },
        { use: 'fast-default' },
      ]);
      const result = modelService.negotiateModel(undefined, { sensitive: true });
      expect(result).toBeUndefined();
    });

    it('gating does not apply to prefer — graceful fallthrough', () => {
      // Remove sensitive rules
      modelService.setRules([
        { match: { reasoning: true }, use: 'reasoning-model' },
        { use: 'fast-default' },
      ]);
      // sensitive: 'prefer' is soft — catch-all still matches
      const result = modelService.negotiateModel(undefined, { sensitive: 'prefer' });
      expect(result.name).toBe('fast-default');
    });

    it('reasoning: prefer falls through to catch-all when no reasoning rule matches', () => {
      modelService.setRules([{ use: 'fast-default' }]);
      const result = modelService.negotiateModel(undefined, { reasoning: 'prefer' });
      expect(result.name).toBe('fast-default');
    });

    it("rules that don't mention a gated cap are skipped for hard-required gated caps", () => {
      // Add a rule that matches cheap: true but doesn't mention sensitive
      modelService.setRules([
        { match: { cheap: true }, use: 'budget-model' },
        { match: { sensitive: true }, use: 'sensitive-default' },
        { use: 'fast-default' },
      ]);
      // Consumer requires sensitive + cheap — the cheap rule is skipped (doesn't mention sensitive)
      const result = modelService.negotiateModel(undefined, { sensitive: true, cheap: true });
      expect(result.name).toBe('sensitive-default');
    });
  });

  // ── Prefer semantics ──────────────────────────────────────────────

  describe('Prefer semantics', () => {
    it('prefer satisfies a rule condition of true', () => {
      // sensitive: 'prefer' satisfies the sensitive: true match condition
      const result = modelService.negotiateModel(undefined, { sensitive: 'prefer' });
      expect(result.name).toBe('sensitive-default');
    });

    it('prefer + good: true matches sensitive-good rule', () => {
      const result = modelService.negotiateModel(undefined, { sensitive: 'prefer', good: true });
      expect(result.name).toBe('sensitive-good');
    });

    it('prefer does not trigger gating — can fall through', () => {
      modelService.setRules([{ use: 'fast-default' }]);
      const result = modelService.negotiateModel(undefined, { sensitive: 'prefer' });
      expect(result.name).toBe('fast-default');
    });
  });

  // ── Negation ──────────────────────────────────────────────────────

  describe('Negation', () => {
    it('rule with good: false rejects consumer requesting good: true', () => {
      // The budget rule requires good: false; consumer has good: true → no match
      const result = modelService.negotiateModel(undefined, { cheap: true, good: true });
      // Falls through to catch-all
      expect(result.name).toBe('fast-default');
    });

    it('consumer good: false matches rule requiring good: false', () => {
      const result = modelService.negotiateModel(undefined, { cheap: true, good: false });
      expect(result.name).toBe('budget-model');
    });

    it('consumer with negated cap that no rule checks falls through to catch-all', () => {
      const result = modelService.negotiateModel(undefined, { fast: false });
      expect(result.name).toBe('fast-default');
    });
  });

  // ── Preferred model name (escape hatch) ───────────────────────────

  describe('Preferred model name', () => {
    it('returns the named model directly when it resolves', () => {
      const result = modelService.negotiateModel('budget-model', { fast: true });
      expect(result.name).toBe('budget-model');
    });

    it("falls back to rule negotiation when preferred model name doesn't resolve", () => {
      const result = modelService.negotiateModel('nonexistent', { cheap: true, good: false });
      expect(result.name).toBe('budget-model');
    });

    it("uses preferred model even if it doesn't match rule conditions", () => {
      // Escape hatch ignores rules entirely — just resolves the name
      const result = modelService.negotiateModel('reasoning-model');
      expect(result.name).toBe('reasoning-model');
    });
  });

  // ── Default model ─────────────────────────────────────────────────

  describe('getDefaultModel', () => {
    it('returns the model from the catch-all rule', () => {
      expect(modelService.getDefaultModel().name).toBe('fast-default');
    });

    it('returns the last rule if no explicit catch-all exists', () => {
      modelService.setRules([
        { match: { sensitive: true }, use: 'sensitive-default' },
        { match: { reasoning: true }, use: 'reasoning-model' },
      ]);
      // No catch-all → last rule is the fallback
      expect(modelService.getDefaultModel().name).toBe('reasoning-model');
    });
  });

  // ── getBestPrivateModel ───────────────────────────────────────────

  describe('getBestPrivateModel', () => {
    it('returns the sensitive model when one is configured', () => {
      expect(modelService.getBestPrivateModel().name).toBe('sensitive-good');
    });

    it('throws when no sensitive rule is configured', () => {
      modelService.setRules([{ use: 'fast-default' }]);
      expect(() => modelService.getBestPrivateModel()).toThrow('No sensitive model configured');
    });
  });

  // ── Custom models via addModels ───────────────────────────────────

  describe('addModels', () => {
    it('custom models are resolvable by name', () => {
      modelService.addModels({
        'my-llama': { maxContextWindow: 8192, maxOutputTokens: 4096, requestTimeout: 1000 },
      });
      const model = modelService.getModel('my-llama');
      expect(model.name).toBe('my-llama');
    });

    it('custom models can be used in rules', () => {
      modelService.addModels({
        'my-llama': { maxContextWindow: 8192, maxOutputTokens: 4096, requestTimeout: 1000 },
      });
      modelService.setRules([{ use: 'my-llama' }]);
      const result = modelService.negotiateModel(undefined, {});
      expect(result.name).toBe('my-llama');
    });
  });

  // ── Return type ───────────────────────────────────────────────────

  describe('Return type', () => {
    it('returns a Model instance', () => {
      const result = modelService.negotiateModel(undefined, {});
      expect(result).toBeInstanceOf(Model);
    });

    it('returns undefined when no rule matches', () => {
      const result = modelService.negotiateModel(undefined, { sensitive: true, reasoning: true });
      expect(result).toBeUndefined();
    });
  });
});

describe('resolveModel', () => {
  beforeEach(() => {
    modelService._modelCache.clear();
    modelService.customModels = {};
    modelService.gatedCapabilities = new Set(['sensitive', 'reasoning']);

    modelService.addModels({
      'gpt-4.1-mini': { maxContextWindow: 128000, maxOutputTokens: 16384, requestTimeout: 1000 },
      'gpt-4.1-nano': { maxContextWindow: 128000, maxOutputTokens: 16384, requestTimeout: 1000 },
      'o3-mini': { maxContextWindow: 128000, maxOutputTokens: 16384, requestTimeout: 1000 },
    });

    modelService.setRules([
      { match: { reasoning: true }, use: 'o3-mini' },
      { match: { cheap: true, good: false }, use: 'gpt-4.1-nano' },
      { use: 'gpt-4.1-mini' },
    ]);
  });

  it('resolves a string model name to itself', () => {
    expect(resolveModel('gpt-4.1-mini')).toBe('gpt-4.1-mini');
  });

  it('resolves flat capability flags to a model name', () => {
    expect(resolveModel({ cheap: true, good: false })).toBe('gpt-4.1-nano');
  });

  it('resolves reasoning capability to reasoning model name', () => {
    expect(resolveModel({ reasoning: true })).toBe('o3-mini');
  });

  it('resolves modelName as escape hatch', () => {
    expect(resolveModel({ modelName: 'gpt-4.1-nano' })).toBe('gpt-4.1-nano');
  });

  it('returns default model name for undefined', () => {
    expect(resolveModel(undefined)).toBe('gpt-4.1-mini');
  });

  it('returns default model name for null', () => {
    expect(resolveModel(null)).toBe('gpt-4.1-mini');
  });

  it('resolves explicit negotiate object', () => {
    expect(resolveModel({ negotiate: { reasoning: true } })).toBe('o3-mini');
  });

  it('returns undefined for unknown string model name', () => {
    expect(resolveModel('nonexistent-model')).toBeUndefined();
  });

  it('returns default for empty object', () => {
    expect(resolveModel({})).toBe('gpt-4.1-mini');
  });
});
