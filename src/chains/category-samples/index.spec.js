import { describe, it, expect, vi, beforeEach } from 'vitest';
import categorySamples, {
  buildSeedGenerationPrompt,
  SAMPLE_GENERATION_PROMPT,
  categorySamplesList,
} from './index.js';
import list from '../list/index.js';
import retry from '../../lib/retry/index.js';

vi.mock('../list/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => fn()),
}));

beforeEach(() => {
  vi.clearAllMocks();
  list.mockResolvedValue(['item-a', 'item-b', 'item-c']);
});

describe('categorySamples', () => {
  describe('basic call', () => {
    it('returns array of sample items from list chain', async () => {
      const samples = ['apple', 'banana', 'cherry', 'date', 'elderberry'];
      list.mockResolvedValueOnce(samples);

      const result = await categorySamples('fruits', { count: 5 });

      expect(result).toStrictEqual(samples);
    });

    it('truncates results to requested count', async () => {
      const samples = Array.from({ length: 40 }, (_, i) => `item-${i}`);
      list.mockResolvedValueOnce(samples);

      const result = await categorySamples('things', { count: 10 });

      expect(result).toHaveLength(10);
      expect(result).toStrictEqual(samples.slice(0, 10));
    });

    it('uses default count of 30', async () => {
      const samples = Array.from({ length: 35 }, (_, i) => `sample-${i}`);
      list.mockResolvedValueOnce(samples);

      const result = await categorySamples('items');

      expect(result).toHaveLength(30);
    });

    it('passes built prompt to list chain', async () => {
      await categorySamples('tropical fish');

      const promptArg = list.mock.calls[0][0];
      expect(promptArg).toContain('tropical fish');
    });

    it('passes shouldStop callback based on count to list', async () => {
      await categorySamples('dogs', { count: 15 });

      const listConfig = list.mock.calls[0][1];
      expect(typeof listConfig.shouldStop).toBe('function');

      // Should not stop when fewer results than count
      expect(listConfig.shouldStop({ resultsAll: Array(10) })).toBe(false);
      // Should stop when results reach count
      expect(listConfig.shouldStop({ resultsAll: Array(15) })).toBe(true);
      // Should stop when results exceed count
      expect(listConfig.shouldStop({ resultsAll: Array(20) })).toBe(true);
    });

    it('uses default llm of fastGoodCheap', async () => {
      await categorySamples('movies');

      const listConfig = list.mock.calls[0][1];
      expect(listConfig.llm).toBe('fastGoodCheap');
    });

    it('passes now to list', async () => {
      const now = new Date('2026-01-15');
      await categorySamples('books', { now });

      const listConfig = list.mock.calls[0][1];
      expect(listConfig.now).toBe(now);
    });
  });

  describe('progress scoping', () => {
    it('passes scoped onProgress to list chain', async () => {
      const onProgress = vi.fn();
      await categorySamples('cuisines', { onProgress });

      const listConfig = list.mock.calls[0][1];
      // scopeProgress wraps the callback, so it should be a function but not the same reference
      expect(typeof listConfig.onProgress).toBe('function');
      expect(listConfig.onProgress).not.toBe(onProgress);
    });

    it('scoped onProgress tags events with list:sampling phase', async () => {
      const onProgress = vi.fn();
      await categorySamples('beverages', { onProgress });

      const listConfig = list.mock.calls[0][1];
      // Call the scoped progress callback and verify it forwards with phase
      listConfig.onProgress({ event: 'start', step: 'list' });

      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ phase: 'list:sampling' }));
    });
  });

  describe('error handling', () => {
    it('throws when categoryName is missing', async () => {
      await expect(categorySamples()).rejects.toThrow('categoryName must be a non-empty string');
    });

    it('throws when categoryName is empty string', async () => {
      await expect(categorySamples('')).rejects.toThrow('categoryName must be a non-empty string');
    });

    it('throws when categoryName is not a string', async () => {
      await expect(categorySamples(42)).rejects.toThrow('categoryName must be a non-empty string');
      await expect(categorySamples(null)).rejects.toThrow(
        'categoryName must be a non-empty string'
      );
      await expect(categorySamples(undefined)).rejects.toThrow(
        'categoryName must be a non-empty string'
      );
    });

    it('throws when list returns empty results', async () => {
      list.mockResolvedValueOnce([]);

      await expect(categorySamples('obscure things')).rejects.toThrow(
        'No sample items generated for category: obscure things'
      );
    });

    it('throws when list returns null', async () => {
      list.mockResolvedValueOnce(null);

      await expect(categorySamples('nothing')).rejects.toThrow(
        'No sample items generated for category: nothing'
      );
    });

    it('propagates errors from list chain through retry', async () => {
      const error = new Error('LLM call failed');
      list.mockRejectedValueOnce(error);

      await expect(categorySamples('failing')).rejects.toThrow('LLM call failed');
    });

    it('retry receives the generateWithRetry function', async () => {
      await categorySamples('test');

      expect(retry).toHaveBeenCalledTimes(1);
      expect(typeof retry.mock.calls[0][0]).toBe('function');
    });
  });
});

describe('buildSeedGenerationPrompt', () => {
  it('inserts category name into prompt', () => {
    const prompt = buildSeedGenerationPrompt('tropical birds');

    expect(prompt).toContain('tropical birds');
  });

  it('produces different output for each diversity level', () => {
    const defaultPrompt = buildSeedGenerationPrompt('cars');
    const highPrompt = buildSeedGenerationPrompt('music genres', { diversity: 'high' });
    const lowPrompt = buildSeedGenerationPrompt('sports', { diversity: 'low' });

    expect(defaultPrompt).not.toBe(highPrompt);
    expect(defaultPrompt).not.toBe(lowPrompt);
    expect(highPrompt).not.toBe(lowPrompt);
  });

  it('falls back to default for unknown diversity level', () => {
    const defaultPrompt = buildSeedGenerationPrompt('foods');
    const unknownPrompt = buildSeedGenerationPrompt('foods', { diversity: 'unknown' });

    expect(unknownPrompt).toBe(defaultPrompt);
  });

  it('includes context when provided', () => {
    const prompt = buildSeedGenerationPrompt('programming languages', {
      context: 'Focus on languages used in web development',
    });

    expect(prompt).toContain('Focus on languages used in web development');
  });

  it('omits context line when context is empty', () => {
    const promptWithContext = buildSeedGenerationPrompt('flowers', {
      context: 'tropical only',
    });
    const promptWithout = buildSeedGenerationPrompt('flowers');

    expect(promptWithContext).toContain('tropical only');
    expect(promptWithout).not.toContain('tropical only');
  });
});

describe('SAMPLE_GENERATION_PROMPT', () => {
  it('is a non-empty string template', () => {
    expect(typeof SAMPLE_GENERATION_PROMPT).toBe('string');
    expect(SAMPLE_GENERATION_PROMPT.length).toBeGreaterThan(0);
  });

  it('contains all template placeholders', () => {
    expect(SAMPLE_GENERATION_PROMPT).toContain('{categoryName}');
    expect(SAMPLE_GENERATION_PROMPT).toContain('{context}');
    expect(SAMPLE_GENERATION_PROMPT).toContain('{diversityInstructions}');
    expect(SAMPLE_GENERATION_PROMPT).toContain('{diversityRequirement}');
  });
});

describe('categorySamplesList', () => {
  it('delegates to list chain', async () => {
    const expected = ['a', 'b', 'c'];
    list.mockResolvedValueOnce(expected);

    const result = await categorySamplesList('test category');

    expect(list).toHaveBeenCalledWith('test category', {});
    expect(result).toStrictEqual(expected);
  });

  it('forwards options to list chain', async () => {
    list.mockResolvedValueOnce([]);
    const options = { llm: 'fast', maxAttempts: 2 };

    await categorySamplesList('things', 10, options);

    expect(list).toHaveBeenCalledWith('things', options);
  });

  it('ignores count parameter (API compatibility)', async () => {
    list.mockResolvedValueOnce(['x']);

    await categorySamplesList('items', 999, { llm: 'test' });

    // count is not forwarded to list - only category and options
    expect(list).toHaveBeenCalledWith('items', { llm: 'test' });
  });
});
