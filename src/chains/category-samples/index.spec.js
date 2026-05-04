import { vi, beforeEach, expect } from 'vitest';
import categorySamples, { buildSeedGenerationPrompt } from './index.js';
import list from '../list/index.js';
import retry from '../../lib/retry/index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

vi.mock('../list/index.js', () => ({ default: vi.fn() }));
vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn(async (fn) => fn()) }));

beforeEach(() => {
  vi.clearAllMocks();
  list.mockResolvedValue(['item-a', 'item-b', 'item-c']);
});

const samples40 = Array.from({ length: 40 }, (_, i) => `item-${i}`);
const samples35 = Array.from({ length: 35 }, (_, i) => `sample-${i}`);

runTable({
  describe: 'categorySamples',
  examples: [
    {
      name: 'returns sample items from list chain',
      inputs: { categoryName: 'fruits', options: { count: 5 } },
      mocks: { list: [['apple', 'banana', 'cherry', 'date', 'elderberry']] },
      want: { value: ['apple', 'banana', 'cherry', 'date', 'elderberry'] },
    },
    {
      name: 'truncates results to requested count',
      inputs: { categoryName: 'things', options: { count: 10 } },
      mocks: { list: [samples40] },
      want: { length: 10, value: samples40.slice(0, 10) },
    },
    {
      name: 'uses default count of 30',
      inputs: { categoryName: 'items' },
      mocks: { list: [samples35] },
      want: { length: 30 },
    },
    {
      name: 'passes built prompt and shouldStop to list',
      inputs: { categoryName: 'dogs', options: { count: 15 } },
      want: {
        promptContains: ['dogs'],
        shouldStop: [
          { resultsAll: Array(10), expected: false },
          { resultsAll: Array(15), expected: true },
          { resultsAll: Array(20), expected: true },
        ],
      },
    },
    {
      name: 'throws when categoryName is missing',
      inputs: { categoryName: undefined },
      want: { throws: /categoryName must be a non-empty string/ },
    },
    {
      name: 'throws when categoryName is empty string',
      inputs: { categoryName: '' },
      want: { throws: /categoryName must be a non-empty string/ },
    },
    {
      name: 'throws when categoryName is a number',
      inputs: { categoryName: 42 },
      want: { throws: /categoryName must be a non-empty string/ },
    },
    {
      name: 'throws when categoryName is null',
      inputs: { categoryName: null },
      want: { throws: /categoryName must be a non-empty string/ },
    },
    {
      name: 'throws when list returns empty results',
      inputs: { categoryName: 'obscure things' },
      mocks: { list: [[]] },
      want: { throws: /No sample items generated for category: obscure things/ },
    },
    {
      name: 'throws when list returns null results',
      inputs: { categoryName: 'nothing' },
      mocks: { list: [null] },
      want: { throws: /No sample items generated for category: nothing/ },
    },
    {
      name: 'propagates errors from list chain through retry',
      inputs: { categoryName: 'failing' },
      mocks: { list: [new Error('LLM call failed')] },
      want: { throws: 'LLM call failed', retryCalls: 1 },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { list });
    return categorySamples(inputs.categoryName, inputs.options);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      const matcher = want.throws;
      if (typeof matcher === 'string') expect(error?.message).toBe(matcher);
      else expect(error?.message).toMatch(matcher);
      if ('retryCalls' in want) expect(retry).toHaveBeenCalledTimes(want.retryCalls);
      return;
    }
    if (error) throw error;
    if ('value' in want) expect(result).toEqual(want.value);
    if ('length' in want) expect(result).toHaveLength(want.length);
    if (want.promptContains) {
      const [promptArg] = list.mock.calls[0];
      for (const fragment of want.promptContains) expect(promptArg).toContain(fragment);
    }
    if (want.shouldStop) {
      const [, listConfig] = list.mock.calls[0];
      for (const { resultsAll, expected } of want.shouldStop) {
        expect(listConfig.shouldStop({ resultsAll })).toBe(expected);
      }
    }
  },
});

runTable({
  describe: 'buildSeedGenerationPrompt',
  examples: [
    {
      name: 'inserts category name and context into prompt',
      inputs: {
        categoryName: 'tropical birds',
        options: { context: 'Focus on endangered species' },
      },
      want: { contains: ['tropical birds', 'Focus on endangered species'] },
    },
    {
      name: 'produces different output for each diversity level',
      inputs: {},
      want: { allDistinct: true },
    },
    {
      name: 'falls back to default for unknown diversity level',
      inputs: {},
      want: { unknownEqualsDefault: true },
    },
  ],
  process: ({ inputs }) =>
    inputs.categoryName
      ? buildSeedGenerationPrompt(inputs.categoryName, inputs.options)
      : undefined,
  expects: ({ result, want }) => {
    if (want.contains) {
      for (const fragment of want.contains) expect(result).toContain(fragment);
    }
    if (want.allDistinct) {
      const defaultPrompt = buildSeedGenerationPrompt('cars');
      const highPrompt = buildSeedGenerationPrompt('music genres', { diversity: 'high' });
      const lowPrompt = buildSeedGenerationPrompt('sports', { diversity: 'low' });
      expect(defaultPrompt).not.toBe(highPrompt);
      expect(defaultPrompt).not.toBe(lowPrompt);
      expect(highPrompt).not.toBe(lowPrompt);
    }
    if (want.unknownEqualsDefault) {
      const defaultPrompt = buildSeedGenerationPrompt('foods');
      const unknownPrompt = buildSeedGenerationPrompt('foods', { diversity: 'unknown' });
      expect(unknownPrompt).toBe(defaultPrompt);
    }
  },
});
