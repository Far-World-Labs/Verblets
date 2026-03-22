import { beforeEach, describe, expect, it } from 'vitest';
import modelService, { resolveModel, getCapabilities, sensitivityAvailable } from './index.js';
import Model from './model.js';

// helper tokenizer
const tokenizer = (t) => t.split(' ');

describe('Model negotiation', () => {
  beforeEach(() => {
    // Reset models before each test
    modelService.models = {};
    modelService.bestPublicModelKey = 'fastGood';
  });

  describe('Sensitive models (two-tier)', () => {
    it('sensitive: true selects fast (2b) tier by default', () => {
      modelService.models = {
        sensitive: new Model({
          name: 'qwen3.5:2b',
          maxContextWindow: 32768,
          maxOutputTokens: 8192,
          requestTimeout: 1000,
          tokenizer,
        }),
        sensitiveGood: new Model({
          name: 'qwen3.5:4b',
          maxContextWindow: 32768,
          maxOutputTokens: 8192,
          requestTimeout: 1000,
          tokenizer,
        }),
        fastGood: new Model({
          name: 'fast-good',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
      };

      expect(modelService.negotiateModel('fastGood', { sensitive: true })).toBe('sensitive');
    });

    it('sensitive + good selects quality (4b) tier', () => {
      modelService.models = {
        sensitive: new Model({
          name: 'qwen3.5:2b',
          maxContextWindow: 32768,
          maxOutputTokens: 8192,
          requestTimeout: 1000,
          tokenizer,
        }),
        sensitiveGood: new Model({
          name: 'qwen3.5:4b',
          maxContextWindow: 32768,
          maxOutputTokens: 8192,
          requestTimeout: 1000,
          tokenizer,
        }),
        fastGood: new Model({
          name: 'fast-good',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
      };

      expect(modelService.negotiateModel('fastGood', { sensitive: true, good: true })).toBe(
        'sensitiveGood'
      );
    });

    it('sensitive + fast selects fast (2b) tier', () => {
      modelService.models = {
        sensitive: new Model({
          name: 'qwen3.5:2b',
          maxContextWindow: 32768,
          maxOutputTokens: 8192,
          requestTimeout: 1000,
          tokenizer,
        }),
        sensitiveGood: new Model({
          name: 'qwen3.5:4b',
          maxContextWindow: 32768,
          maxOutputTokens: 8192,
          requestTimeout: 1000,
          tokenizer,
        }),
      };

      expect(modelService.negotiateModel(null, { sensitive: true, fast: true })).toBe('sensitive');
    });

    it('falls back to sensitiveGood when only quality tier is available', () => {
      modelService.models = {
        sensitiveGood: new Model({
          name: 'qwen3.5:4b',
          maxContextWindow: 32768,
          maxOutputTokens: 8192,
          requestTimeout: 1000,
          tokenizer,
        }),
      };

      // No good flag, but only sensitiveGood exists — falls back
      expect(modelService.negotiateModel(null, { sensitive: true })).toBe('sensitiveGood');
    });

    it('falls back to sensitive when good requested but only fast tier available', () => {
      modelService.models = {
        sensitive: new Model({
          name: 'qwen3.5:2b',
          maxContextWindow: 32768,
          maxOutputTokens: 8192,
          requestTimeout: 1000,
          tokenizer,
        }),
      };

      expect(modelService.negotiateModel(null, { sensitive: true, good: true })).toBe('sensitive');
    });

    it('returns undefined when no sensitive models configured and sensitive required', () => {
      modelService.models = {
        fastGood: new Model({
          name: 'fast-good',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
      };

      expect(modelService.negotiateModel('fastGood', { sensitive: true })).toBe(undefined);
    });
  });

  describe('Exact model key matching', () => {
    beforeEach(() => {
      modelService.models = {
        fastGood: new Model({
          name: 'fast-good',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
        fastCheap: new Model({
          name: 'fast-cheap',
          maxContextWindow: 128000,
          maxOutputTokens: 8192,
          requestTimeout: 1000,
          tokenizer,
        }),
        fastReasoning: new Model({
          name: 'fast-reasoning',
          maxContextWindow: 200000,
          maxOutputTokens: 100000,
          requestTimeout: 1000,
          tokenizer,
        }),
        fastCheapReasoning: new Model({
          name: 'fast-cheap-reasoning',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
        fastGoodMulti: new Model({
          name: 'fast-good-multi',
          maxContextWindow: 1000000,
          maxOutputTokens: 32768,
          requestTimeout: 1000,
          tokenizer,
        }),
        fastCheapReasoningMulti: new Model({
          name: 'fast-cheap-reasoning-multi',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
        good: new Model({
          name: 'good',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
        reasoning: new Model({
          name: 'reasoning',
          maxContextWindow: 200000,
          maxOutputTokens: 100000,
          requestTimeout: 1000,
          tokenizer,
        }),
        fast: new Model({
          name: 'fast',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
        cheap: new Model({
          name: 'cheap',
          maxContextWindow: 128000,
          maxOutputTokens: 8192,
          requestTimeout: 1000,
          tokenizer,
        }),
      };
    });

    it('returns highest priority match for fast + cheap', () => {
      // Should find fastCheap since it has both fast and cheap
      const key = modelService.negotiateModel(null, { fast: true, cheap: true });
      expect(key).toBe('fastCheap'); // fastCheap matches both requirements
    });

    it('returns highest priority match for fast + reasoning', () => {
      // Should find fastReasoning since it has both fast and reasoning
      const key = modelService.negotiateModel(null, { fast: true, reasoning: true });
      expect(key).toBe('fastCheapReasoning'); // fastReasoning matches both requirements
    });

    it('returns exact match when it exists and has high priority', () => {
      const key = modelService.negotiateModel(null, { fast: true, cheap: true, reasoning: true });
      expect(key).toBe('fastCheapReasoning'); // Exact match exists
    });

    it('returns exact match for fast + good + multi', () => {
      const key = modelService.negotiateModel(null, { fast: true, good: true, multi: true });
      expect(key).toBe('fastGoodMulti'); // Exact match exists
    });

    it('returns exact match for fast + cheap + reasoning + multi', () => {
      const key = modelService.negotiateModel(null, {
        fast: true,
        cheap: true,
        reasoning: true,
        multi: true,
      });
      expect(key).toBe('fastCheapReasoningMulti'); // Exact match exists
    });
  });

  describe('Fallback logic', () => {
    beforeEach(() => {
      modelService.models = {
        fastGoodCheap: new Model({
          name: 'fast-good-cheap',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
        fastGood: new Model({
          name: 'fast-good',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
        fastCheap: new Model({
          name: 'fast-cheap',
          maxContextWindow: 128000,
          maxOutputTokens: 8192,
          requestTimeout: 1000,
          tokenizer,
        }),
        fastReasoning: new Model({
          name: 'fast-reasoning',
          maxContextWindow: 200000,
          maxOutputTokens: 100000,
          requestTimeout: 1000,
          tokenizer,
        }),
        good: new Model({
          name: 'good',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
        reasoning: new Model({
          name: 'reasoning',
          maxContextWindow: 200000,
          maxOutputTokens: 100000,
          requestTimeout: 1000,
          tokenizer,
        }),
        fast: new Model({
          name: 'fast',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
        cheap: new Model({
          name: 'cheap',
          maxContextWindow: 128000,
          maxOutputTokens: 8192,
          requestTimeout: 1000,
          tokenizer,
        }),
      };
    });

    it('finds exact match when available', () => {
      const key = modelService.negotiateModel(null, { fast: true, good: true });
      expect(key).toBe('fastGoodCheap');
    });

    it('requires all specified features to match', () => {
      // Request multi but no multi models exist - should return undefined
      expect(modelService.negotiateModel(null, { fast: true, multi: true })).toBe(undefined);
    });

    it('picks higher priority model when multiple match', () => {
      // Both fastGoodCheap, fastGood and good match { good: true }, should pick fastGoodCheap (highest priority)
      const key = modelService.negotiateModel(null, { good: true });
      expect(key).toBe('fastGoodCheap');
    });

    it('respects all requirements strictly', () => {
      // Request fast + cheap + reasoning - no exact match available, should return undefined since reasoning is requested
      expect(modelService.negotiateModel(null, { fast: true, cheap: true, reasoning: true })).toBe(
        undefined
      );
    });

    it('works with single requirements', () => {
      const key = modelService.negotiateModel(null, { reasoning: true });
      expect(key).toBe('fastReasoning');
    });

    it('works with multi requirement when available', () => {
      modelService.models.fastGoodMulti = new Model({
        name: 'fast-good-multi',
        maxContextWindow: 1000000,
        maxOutputTokens: 32768,
        requestTimeout: 1000,
        tokenizer,
      });

      const key = modelService.negotiateModel(null, { fast: true, good: true, multi: true });
      expect(key).toBe('fastGoodMulti');
    });

    it('falls back to best public model when no matches found', () => {
      // Request something that doesn't exist with reasoning - should return undefined
      expect(
        modelService.negotiateModel(null, {
          fast: true,
          cheap: true,
          good: true,
          reasoning: true,
          multi: true,
        })
      ).toBe(undefined);
    });

    it('prioritizes better combinations over individual features', () => {
      // Both fast and fastGoodCheap match { fast: true }, should pick fastGoodCheap
      const key = modelService.negotiateModel(null, { fast: true });
      expect(key).toBe('fastGoodCheap');
    });
  });

  describe('Preferred model handling', () => {
    beforeEach(() => {
      modelService.models = {
        fastGood: new Model({
          name: 'fast-good',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
        customModel: new Model({
          name: 'custom',
          maxContextWindow: 64000,
          maxOutputTokens: 8192,
          requestTimeout: 1000,
          tokenizer,
        }),
      };
    });

    it('returns preferred model when available and no sensitive requested', () => {
      const key = modelService.negotiateModel('customModel', { fast: true });
      expect(key).toBe('fastGood');
    });

    it('ignores preferred model when sensitive is requested', () => {
      modelService.models.sensitive = new Model({
        name: 'qwen3.5:2b',
        maxContextWindow: 32768,
        maxOutputTokens: 8192,
        requestTimeout: 1000,
        tokenizer,
      });

      const key = modelService.negotiateModel('customModel', { sensitive: true });
      expect(key).toBe('sensitive');
    });

    it('falls back to negotiation when preferred model does not exist', () => {
      const key = modelService.negotiateModel('nonExistentModel', { fast: true });
      expect(key).toBe('fastGood');
    });

    it('returns preferred model when it satisfies all requires', () => {
      // fastGood has capabilities {fast, good} — satisfies { fast: true }
      const key = modelService.negotiateModel('fastGood', { fast: true });
      expect(key).toBe('fastGood');
    });

    it('skips preferred model when it does not satisfy requires', () => {
      // customModel has no capabilities — does not satisfy { fast: true }
      const key = modelService.negotiateModel('customModel', { fast: true });
      expect(key).toBe('fastGood');
    });

    it('returns preferred model when it satisfies requires, even with prefers', () => {
      // No hard requires, just prefers — preferred satisfies requires (vacuously) → preferred wins
      // User explicitly named a model; it qualifies, so we respect their choice
      const key = modelService.negotiateModel('customModel', { fast: 'prefer' });
      expect(key).toBe('customModel');
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      modelService.models = {
        fastGood: new Model({
          name: 'fast-good',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
      };
    });

    it('handles empty negotiation object', () => {
      const key = modelService.negotiateModel(null, {});
      expect(key).toBe('fastGood');
    });

    it('handles undefined negotiation', () => {
      const key = modelService.negotiateModel(null);
      expect(key).toBe('fastGood');
    });

    it('handles single flag requests', () => {
      const key = modelService.negotiateModel(null, { fast: true });
      expect(key).toBe('fastGood');
    });

    it('prioritizes reasoning over good when both are requested', () => {
      modelService.models.fastReasoning = new Model({
        name: 'fast-reasoning',
        maxContextWindow: 200000,
        maxOutputTokens: 100000,
        requestTimeout: 1000,
        tokenizer,
      });

      // Request fast + reasoning + good but no model has all three - should return undefined
      expect(modelService.negotiateModel(null, { fast: true, reasoning: true, good: true })).toBe(
        undefined
      );
    });
  });

  describe('Property negation', () => {
    beforeEach(() => {
      modelService.models = {
        fastGoodCheap: new Model({
          name: 'fast-good-cheap',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
        fastGood: new Model({
          name: 'fast-good',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
        good: new Model({
          name: 'good',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
        fast: new Model({
          name: 'fast',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
        reasoning: new Model({
          name: 'reasoning',
          maxContextWindow: 200000,
          maxOutputTokens: 100000,
          requestTimeout: 1000,
          tokenizer,
        }),
      };
    });

    it('excludes models with negated properties', () => {
      // Request good but NOT fast - should pick 'good' over 'fastGood'
      const key = modelService.negotiateModel(null, { good: true, fast: false });
      expect(key).toBe('good');
    });

    it('excludes models with multiple negated properties', () => {
      // Request good but NOT fast and NOT cheap - should pick 'good'
      const key = modelService.negotiateModel(null, { good: true, fast: false, cheap: false });
      expect(key).toBe('good');
    });

    it('works with only negated properties', () => {
      // Request NOT fast - should pick 'good' (first non-fast model in priority)
      const key = modelService.negotiateModel(null, { fast: false });
      expect(key).toBe('good');
    });

    it('combines positive and negative requirements', () => {
      // Request fast but NOT good - should pick 'fast' over 'fastGood'
      // fastGoodCheap has both fast and good, so it's excluded by good: false
      // fastGood has both fast and good, so it's excluded by good: false
      // fast has fast but no good, so it matches
      const key = modelService.negotiateModel(null, { fast: true, good: false });
      expect(key).toBe('fast');
    });

    it('falls back when negation eliminates all matches', () => {
      // Request NOT reasoning (all models are non-reasoning, so should pick first priority)
      const key = modelService.negotiateModel(null, { good: false });
      expect(key).toBe('fast');
    });
  });

  describe('Prefer semantics', () => {
    beforeEach(() => {
      modelService.models = {
        fastGoodCheap: new Model({
          name: 'fast-good-cheap',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
        fastGood: new Model({
          name: 'fast-good',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
        fastCheap: new Model({
          name: 'fast-cheap',
          maxContextWindow: 128000,
          maxOutputTokens: 8192,
          requestTimeout: 1000,
          tokenizer,
        }),
        good: new Model({
          name: 'good',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
        fast: new Model({
          name: 'fast',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
        cheap: new Model({
          name: 'cheap',
          maxContextWindow: 128000,
          maxOutputTokens: 8192,
          requestTimeout: 1000,
          tokenizer,
        }),
        reasoning: new Model({
          name: 'reasoning',
          maxContextWindow: 200000,
          maxOutputTokens: 100000,
          requestTimeout: 1000,
          tokenizer,
        }),
        fastReasoning: new Model({
          name: 'fast-reasoning',
          maxContextWindow: 200000,
          maxOutputTokens: 100000,
          requestTimeout: 1000,
          tokenizer,
        }),
      };
    });

    it('prefer alone acts as soft preference, picks model with most matches', () => {
      // prefer good — fastGoodCheap has good, so it wins
      const key = modelService.negotiateModel(null, { good: 'prefer' });
      expect(key).toBe('fastGoodCheap');
    });

    it('prefer does not fail when no model has the capability', () => {
      // prefer multi — no multi models, but prefer is soft, so first model is returned
      const key = modelService.negotiateModel(null, { multi: 'prefer' });
      // All candidates match requires (none), best prefer score is 0 for all, first priority wins
      expect(key).toBe('fastGoodCheap');
    });

    it('require + prefer: filters by require, then ranks by prefer', () => {
      // require fast, prefer good — among fast models, pick one that also has good
      const key = modelService.negotiateModel(null, { fast: true, good: 'prefer' });
      expect(key).toBe('fastGoodCheap'); // has fast (required) + good (preferred)
    });

    it('require + prefer: prefer does not override require', () => {
      // require reasoning, prefer fast — among reasoning models, prefer fast
      const key = modelService.negotiateModel(null, { reasoning: true, fast: 'prefer' });
      expect(key).toBe('fastReasoning'); // reasoning (required) + fast (preferred)
    });

    it('prefer picks higher prefer-score over priority order', () => {
      // require fast, prefer good + cheap — fastGoodCheap has both prefers (score=2), fastGood has 1
      const key = modelService.negotiateModel(null, {
        fast: true,
        good: 'prefer',
        cheap: 'prefer',
      });
      expect(key).toBe('fastGoodCheap');
    });

    it('require + exclude + prefer work together', () => {
      // require fast, exclude cheap, prefer good — fast models without cheap, prefer good
      const key = modelService.negotiateModel(null, {
        fast: true,
        cheap: false,
        good: 'prefer',
      });
      expect(key).toBe('fastGood'); // fast (required), not cheap (excluded), good (preferred)
    });

    it('when prefer is tied, priority order breaks the tie', () => {
      // prefer cheap — fastGoodCheap and fastCheap both have cheap (score=1)
      // fastGoodCheap is higher priority, so it wins
      const key = modelService.negotiateModel(null, { cheap: 'prefer' });
      expect(key).toBe('fastGoodCheap');
    });

    it('sensitive as prefer falls through when no sensitive model', () => {
      // prefer sensitive but no sensitive model — should fall through to normal negotiation
      const key = modelService.negotiateModel(null, { sensitive: 'prefer', fast: true });
      expect(key).toBe('fastGoodCheap');
    });

    it('sensitive as prefer returns fast sensitive model when available', () => {
      modelService.models.sensitive = new Model({
        name: 'qwen3.5:2b',
        maxContextWindow: 32768,
        maxOutputTokens: 8192,
        requestTimeout: 1000,
        tokenizer,
      });

      const key = modelService.negotiateModel(null, { sensitive: 'prefer', fast: true });
      expect(key).toBe('sensitive');
    });

    it('sensitive as prefer with good returns quality tier', () => {
      modelService.models.sensitive = new Model({
        name: 'qwen3.5:2b',
        maxContextWindow: 32768,
        maxOutputTokens: 8192,
        requestTimeout: 1000,
        tokenizer,
      });
      modelService.models.sensitiveGood = new Model({
        name: 'qwen3.5:4b',
        maxContextWindow: 32768,
        maxOutputTokens: 8192,
        requestTimeout: 1000,
        tokenizer,
      });

      const key = modelService.negotiateModel(null, { sensitive: 'prefer', good: true });
      expect(key).toBe('sensitiveGood');
    });
  });
});

describe('resolveModel', () => {
  beforeEach(() => {
    modelService.models = {
      fastGoodCheap: new Model({
        name: 'fast-good-cheap',
        maxContextWindow: 128000,
        maxOutputTokens: 16384,
        requestTimeout: 1000,
        tokenizer,
      }),
      fastGood: new Model({
        name: 'fast-good',
        maxContextWindow: 128000,
        maxOutputTokens: 16384,
        requestTimeout: 1000,
        tokenizer,
      }),
      fastCheap: new Model({
        name: 'fast-cheap',
        maxContextWindow: 128000,
        maxOutputTokens: 8192,
        requestTimeout: 1000,
        tokenizer,
      }),
      good: new Model({
        name: 'good',
        maxContextWindow: 128000,
        maxOutputTokens: 16384,
        requestTimeout: 1000,
        tokenizer,
      }),
      reasoning: new Model({
        name: 'reasoning',
        maxContextWindow: 200000,
        maxOutputTokens: 100000,
        requestTimeout: 1000,
        tokenizer,
      }),
    };
    modelService.bestPublicModelKey = 'fastGood';
  });

  it('resolves a string model key', () => {
    expect(resolveModel('fastGood')).toBe('fastGood');
  });

  it('resolves flat capability flags', () => {
    expect(resolveModel({ fast: true, good: true })).toBe('fastGoodCheap');
  });

  it('resolves capability flags with prefer', () => {
    expect(resolveModel({ fast: true, good: 'prefer' })).toBe('fastGoodCheap');
  });

  it('resolves modelName with capability constraints', () => {
    // fastGood has {fast, good} — satisfies { good: true }
    expect(resolveModel({ modelName: 'fastGood', good: true })).toBe('fastGood');
  });

  it('falls back when modelName does not satisfy constraints', () => {
    // fastCheap has {fast, cheap} — does not satisfy { good: true }
    expect(resolveModel({ modelName: 'fastCheap', good: true })).toBe('fastGoodCheap');
  });

  it('returns default for undefined/null', () => {
    expect(resolveModel(undefined)).toBe('fastGood');
    expect(resolveModel(null)).toBe('fastGood');
  });

  it('resolves explicit negotiate object', () => {
    // fastGoodCheap is higher priority and satisfies both fast + cheap
    expect(resolveModel({ negotiate: { fast: true, cheap: true } })).toBe('fastGoodCheap');
  });
});

describe('getCapabilities', () => {
  beforeEach(() => {
    modelService.models = {
      fastGoodCheap: new Model({
        name: 'fast-good-cheap',
        maxContextWindow: 128000,
        maxOutputTokens: 16384,
        requestTimeout: 1000,
        tokenizer,
      }),
      reasoning: new Model({
        name: 'reasoning',
        maxContextWindow: 200000,
        maxOutputTokens: 100000,
        requestTimeout: 1000,
        tokenizer,
      }),
      sensitive: new Model({
        name: 'sensitive-model',
        maxContextWindow: 128000,
        maxOutputTokens: 8192,
        requestTimeout: 1000,
        tokenizer,
      }),
    };
  });

  it('returns capability Set for a registered model', () => {
    const caps = getCapabilities('fastGoodCheap');
    expect(caps).toBeInstanceOf(Set);
    expect(caps.has('fast')).toBe(true);
    expect(caps.has('good')).toBe(true);
    expect(caps.has('cheap')).toBe(true);
    expect(caps.has('reasoning')).toBe(false);
  });

  it('returns correct capabilities for reasoning model', () => {
    const caps = getCapabilities('reasoning');
    expect(caps.has('reasoning')).toBe(true);
    expect(caps.has('fast')).toBe(false);
  });

  it('returns correct capabilities for sensitive model', () => {
    const caps = getCapabilities('sensitive');
    expect(caps.has('sensitive')).toBe(true);
    expect(caps.size).toBe(1);
  });

  it('returns undefined for unknown model key', () => {
    expect(getCapabilities('nonExistent')).toBeUndefined();
  });

  it('caches capabilities on the model instance', () => {
    const caps1 = getCapabilities('fastGoodCheap');
    const caps2 = getCapabilities('fastGoodCheap');
    expect(caps1).toBe(caps2);
  });
});

describe('sensitivityAvailable', () => {
  beforeEach(() => {
    modelService.models = {};
  });

  it('returns all false when no sensitive models configured', () => {
    modelService.models = {
      fastGood: new Model({
        name: 'fast-good',
        maxContextWindow: 128000,
        maxOutputTokens: 16384,
        requestTimeout: 1000,
        tokenizer,
      }),
    };

    const result = sensitivityAvailable();
    expect(result).toEqual({ available: false, fast: false, good: false });
  });

  it('returns fast only when only sensitive (fast tier) configured', () => {
    modelService.models = {
      sensitive: new Model({
        name: 'qwen3.5:2b',
        maxContextWindow: 32768,
        maxOutputTokens: 8192,
        requestTimeout: 1000,
        tokenizer,
      }),
    };

    const result = sensitivityAvailable();
    expect(result).toEqual({ available: true, fast: true, good: false });
  });

  it('returns both tiers when both configured', () => {
    modelService.models = {
      sensitive: new Model({
        name: 'qwen3.5:2b',
        maxContextWindow: 32768,
        maxOutputTokens: 8192,
        requestTimeout: 1000,
        tokenizer,
      }),
      sensitiveGood: new Model({
        name: 'qwen3.5:4b',
        maxContextWindow: 32768,
        maxOutputTokens: 8192,
        requestTimeout: 1000,
        tokenizer,
      }),
    };

    const result = sensitivityAvailable();
    expect(result).toEqual({ available: true, fast: true, good: true });
  });
});
