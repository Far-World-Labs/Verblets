import { beforeEach, describe, expect, it } from 'vitest';
import modelService from './index.js';
import Model from './model.js';

// helper tokenizer
const tokenizer = (t) => t.split(' ');

describe('Model negotiation', () => {
  beforeEach(() => {
    // Reset models before each test
    modelService.models = {};
    modelService.bestPublicModelKey = 'fastGood';
  });

  describe('Privacy models', () => {
    it('prefers privacy model when requested and available', () => {
      modelService.models = {
        privacy: new Model({
          name: 'privacy-model',
          maxContextWindow: 128000,
          maxOutputTokens: 8192,
          requestTimeout: 1000,
          tokenizer,
        }),
        fastGood: new Model({
          name: 'fast-good-model',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
      };

      const key = modelService.negotiateModel('fastGood', { privacy: true });
      expect(key).toBe('privacy');
    });

    it('throws error when privacy requested but not configured', () => {
      modelService.models = {
        fastGood: new Model({
          name: 'fast-good-model',
          maxContextWindow: 128000,
          maxOutputTokens: 16384,
          requestTimeout: 1000,
          tokenizer,
        }),
      };

      expect(modelService.negotiateModel('fastGood', { privacy: true })).toBe(undefined);
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

    it('returns preferred model when available and no privacy requested', () => {
      const key = modelService.negotiateModel('customModel', { fast: true });
      expect(key).toBe('fastGood');
    });

    it('ignores preferred model when privacy is requested', () => {
      modelService.models.privacy = new Model({
        name: 'privacy',
        maxContextWindow: 128000,
        maxOutputTokens: 8192,
        requestTimeout: 1000,
        tokenizer,
      });

      const key = modelService.negotiateModel('customModel', { privacy: true });
      expect(key).toBe('privacy');
    });

    it('falls back to negotiation when preferred model does not exist', () => {
      const key = modelService.negotiateModel('nonExistentModel', { fast: true });
      expect(key).toBe('fastGood');
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
});
