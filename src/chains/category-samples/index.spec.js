import { describe, it, expect, vi, beforeEach } from 'vitest';
import categorySamples, { buildSeedGenerationPrompt } from './index.js';
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
  it('returns sample items from list chain', async () => {
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

  it('passes built prompt and shouldStop to list', async () => {
    await categorySamples('dogs', { count: 15 });

    const [promptArg, listConfig] = list.mock.calls[0];
    expect(promptArg).toContain('dogs');
    expect(listConfig.shouldStop({ resultsAll: Array(10) })).toBe(false);
    expect(listConfig.shouldStop({ resultsAll: Array(15) })).toBe(true);
    expect(listConfig.shouldStop({ resultsAll: Array(20) })).toBe(true);
  });

  it.each([
    ['missing', undefined],
    ['empty string', ''],
    ['number', 42],
    ['null', null],
  ])('throws when categoryName is %s', async (_label, value) => {
    await expect(categorySamples(value)).rejects.toThrow('categoryName must be a non-empty string');
  });

  it('throws when list returns empty or null results', async () => {
    list.mockResolvedValueOnce([]);
    await expect(categorySamples('obscure things')).rejects.toThrow(
      'No sample items generated for category: obscure things'
    );

    list.mockResolvedValueOnce(null);
    await expect(categorySamples('nothing')).rejects.toThrow(
      'No sample items generated for category: nothing'
    );
  });

  it('propagates errors from list chain through retry', async () => {
    list.mockRejectedValueOnce(new Error('LLM call failed'));

    await expect(categorySamples('failing')).rejects.toThrow('LLM call failed');
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe('buildSeedGenerationPrompt', () => {
  it('inserts category name and context into prompt', () => {
    const prompt = buildSeedGenerationPrompt('tropical birds', {
      context: 'Focus on endangered species',
    });

    expect(prompt).toContain('tropical birds');
    expect(prompt).toContain('Focus on endangered species');
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
});
