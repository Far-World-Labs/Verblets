import { describe, it, expect, vi, beforeEach } from 'vitest';
import categorySamples, {
  buildSeedGenerationPrompt,
  SAMPLE_GENERATION_PROMPT,
  categorySamplesList,
  mapDiversity,
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
      expect(promptArg).toContain('cognitive science principles');
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

  describe('forwards llm config to internal calls', () => {
    it('passes string llm to list chain', async () => {
      const llm = 'fastGood';
      await categorySamples('cities', { llm });

      const listConfig = list.mock.calls[0][1];
      expect(listConfig.llm).toBe(llm);
    });

    it('passes object llm to list chain', async () => {
      const llm = { modelName: 'gpt-4', temperature: 0.8 };
      await categorySamples('animals', { llm });

      const listConfig = list.mock.calls[0][1];
      expect(listConfig.llm).toBe(llm);
    });
  });

  describe('forwards maxAttempts to retry', () => {
    it('passes maxAttempts to outer retry wrapper', async () => {
      await categorySamples('colors', { maxAttempts: 5 });

      const retryConfig = retry.mock.calls[0][1];
      expect(retryConfig.maxAttempts).toBe(5);
    });

    it('passes maxAttempts to list chain inside retry', async () => {
      await categorySamples('shapes', { maxAttempts: 7 });

      const listConfig = list.mock.calls[0][1];
      expect(listConfig.maxAttempts).toBe(7);
    });

    it('uses default maxAttempts of 3', async () => {
      await categorySamples('genres');

      const retryConfig = retry.mock.calls[0][1];
      expect(retryConfig.maxAttempts).toBe(3);

      const listConfig = list.mock.calls[0][1];
      expect(listConfig.maxAttempts).toBe(3);
    });

    it('passes retryDelay to retry wrapper', async () => {
      await categorySamples('tools', { retryDelay: 2000 });

      const retryConfig = retry.mock.calls[0][1];
      expect(retryConfig.retryDelay).toBe(2000);
    });

    it('uses default retryDelay of 1000', async () => {
      await categorySamples('instruments');

      const retryConfig = retry.mock.calls[0][1];
      expect(retryConfig.retryDelay).toBe(1000);
    });

    it('passes retryOnAll: true to retry wrapper', async () => {
      await categorySamples('languages');

      const retryConfig = retry.mock.calls[0][1];
      expect(retryConfig.retryOnAll).toBe(true);
    });

    it('passes label to retry wrapper', async () => {
      await categorySamples('vehicles');

      const retryConfig = retry.mock.calls[0][1];
      expect(retryConfig.label).toBe('category-samples');
    });
  });

  describe('forwards onProgress to retry', () => {
    it('passes onProgress to outer retry wrapper', async () => {
      const onProgress = vi.fn();
      await categorySamples('sports', { onProgress });

      const retryConfig = retry.mock.calls[0][1];
      expect(retryConfig.onProgress).toBe(onProgress);
    });

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

    it('does not pass onProgress to list when not provided', async () => {
      await categorySamples('countries');

      const listConfig = list.mock.calls[0][1];
      expect(listConfig.onProgress).toBeUndefined();
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
    expect(prompt).toContain('Generate sample items for the category');
  });

  it('uses default diversity when not specified', () => {
    const prompt = buildSeedGenerationPrompt('cars');

    expect(prompt).toContain(
      'Include a mix of typical, moderately typical, and some atypical members'
    );
    expect(prompt).toContain('Include some moderately atypical members');
  });

  it('uses high diversity level', () => {
    const prompt = buildSeedGenerationPrompt('music genres', { diversity: 'high' });

    expect(prompt).toContain(
      'Include very diverse examples spanning edge cases and borderline members'
    );
    expect(prompt).toContain('Include many atypical but valid members');
  });

  it('uses low diversity level', () => {
    const prompt = buildSeedGenerationPrompt('sports', { diversity: 'low' });

    expect(prompt).toContain(
      'Focus on highly typical, central members with clear category membership'
    );
    expect(prompt).toContain('Focus primarily on typical members');
  });

  it('falls back to default for unknown diversity level', () => {
    const prompt = buildSeedGenerationPrompt('foods', { diversity: 'unknown' });

    expect(prompt).toContain(
      'Include a mix of typical, moderately typical, and some atypical members'
    );
  });

  it('includes context when provided', () => {
    const prompt = buildSeedGenerationPrompt('programming languages', {
      context: 'Focus on languages used in web development',
    });

    expect(prompt).toContain('Context: Focus on languages used in web development');
  });

  it('omits context line when context is empty', () => {
    const prompt = buildSeedGenerationPrompt('flowers');

    expect(prompt).not.toContain('Context:');
  });

  it('includes all cognitive principles', () => {
    const prompt = buildSeedGenerationPrompt('tools');

    expect(prompt).toContain('Prototype Theory');
    expect(prompt).toContain('Family Resemblance');
    expect(prompt).toContain('Category Structure');
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

describe('mapDiversity', () => {
  it('returns default config for undefined', () => {
    const result = mapDiversity(undefined);
    expect(result).toStrictEqual({ diversity: undefined, count: 30 });
  });

  it('returns low diversity with reduced count', () => {
    const result = mapDiversity('low');
    expect(result.diversity).toBe('low');
    expect(result.count).toBe(15);
  });

  it('returns default config for med', () => {
    const result = mapDiversity('med');
    expect(result).toStrictEqual({ diversity: undefined, count: 30 });
  });

  it('returns high diversity with increased count', () => {
    const result = mapDiversity('high');
    expect(result.diversity).toBe('high');
    expect(result.count).toBe(50);
  });

  it('returns default config for unknown string', () => {
    const result = mapDiversity('medium');
    expect(result).toStrictEqual({ diversity: undefined, count: 30 });
  });

  it('passes through object values', () => {
    const custom = { diversity: 'high', count: 100 };
    expect(mapDiversity(custom)).toBe(custom);
  });
});
