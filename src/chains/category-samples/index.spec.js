import { vi, beforeEach, expect } from 'vitest';
import categorySamples, { buildSeedGenerationPrompt } from './index.js';
import list from '../list/index.js';
import retry from '../../lib/retry/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

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
      inputs: {
        categoryName: 'fruits',
        options: { count: 5 },
        mock: () => list.mockResolvedValueOnce(['apple', 'banana', 'cherry', 'date', 'elderberry']),
        want: ['apple', 'banana', 'cherry', 'date', 'elderberry'],
      },
    },
    {
      name: 'truncates results to requested count',
      inputs: {
        categoryName: 'things',
        options: { count: 10 },
        mock: () => list.mockResolvedValueOnce(samples40),
        wantLength: 10,
        want: samples40.slice(0, 10),
      },
    },
    {
      name: 'uses default count of 30',
      inputs: {
        categoryName: 'items',
        mock: () => list.mockResolvedValueOnce(samples35),
        wantLength: 30,
      },
    },
    {
      name: 'passes built prompt and shouldStop to list',
      inputs: {
        categoryName: 'dogs',
        options: { count: 15 },
        wantPromptContains: ['dogs'],
        wantShouldStop: [
          { resultsAll: Array(10), expected: false },
          { resultsAll: Array(15), expected: true },
          { resultsAll: Array(20), expected: true },
        ],
      },
    },
    {
      name: 'throws when categoryName is missing',
      inputs: { categoryName: undefined, throws: /categoryName must be a non-empty string/ },
    },
    {
      name: 'throws when categoryName is empty string',
      inputs: { categoryName: '', throws: /categoryName must be a non-empty string/ },
    },
    {
      name: 'throws when categoryName is a number',
      inputs: { categoryName: 42, throws: /categoryName must be a non-empty string/ },
    },
    {
      name: 'throws when categoryName is null',
      inputs: { categoryName: null, throws: /categoryName must be a non-empty string/ },
    },
    {
      name: 'throws when list returns empty results',
      inputs: {
        categoryName: 'obscure things',
        mock: () => list.mockResolvedValueOnce([]),
        throws: /No sample items generated for category: obscure things/,
      },
    },
    {
      name: 'throws when list returns null results',
      inputs: {
        categoryName: 'nothing',
        mock: () => list.mockResolvedValueOnce(null),
        throws: /No sample items generated for category: nothing/,
      },
    },
    {
      name: 'propagates errors from list chain through retry',
      inputs: {
        categoryName: 'failing',
        mock: () => list.mockRejectedValueOnce(new Error('LLM call failed')),
        throws: 'LLM call failed',
        wantRetryCalls: 1,
      },
    },
  ],
  process: async ({ categoryName, options, mock }) => {
    if (mock) mock();
    return categorySamples(categoryName, options);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      const matcher = inputs.throws;
      if (typeof matcher === 'string') expect(error?.message).toBe(matcher);
      else expect(error?.message).toMatch(matcher);
      if ('wantRetryCalls' in inputs) expect(retry).toHaveBeenCalledTimes(inputs.wantRetryCalls);
      return;
    }
    if (error) throw error;
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('wantLength' in inputs) expect(result).toHaveLength(inputs.wantLength);
    if (inputs.wantPromptContains) {
      const [promptArg] = list.mock.calls[0];
      for (const fragment of inputs.wantPromptContains) expect(promptArg).toContain(fragment);
    }
    if (inputs.wantShouldStop) {
      const [, listConfig] = list.mock.calls[0];
      for (const { resultsAll, expected } of inputs.wantShouldStop) {
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
        wantContains: ['tropical birds', 'Focus on endangered species'],
      },
    },
    {
      name: 'produces different output for each diversity level',
      inputs: { wantAllDistinct: true },
    },
    {
      name: 'falls back to default for unknown diversity level',
      inputs: { wantUnknownEqualsDefault: true },
    },
  ],
  process: ({ categoryName, options }) =>
    categoryName ? buildSeedGenerationPrompt(categoryName, options) : undefined,
  expects: ({ result, inputs }) => {
    if (inputs.wantContains) {
      for (const fragment of inputs.wantContains) expect(result).toContain(fragment);
    }
    if (inputs.wantAllDistinct) {
      const defaultPrompt = buildSeedGenerationPrompt('cars');
      const highPrompt = buildSeedGenerationPrompt('music genres', { diversity: 'high' });
      const lowPrompt = buildSeedGenerationPrompt('sports', { diversity: 'low' });
      expect(defaultPrompt).not.toBe(highPrompt);
      expect(defaultPrompt).not.toBe(lowPrompt);
      expect(highPrompt).not.toBe(lowPrompt);
    }
    if (inputs.wantUnknownEqualsDefault) {
      const defaultPrompt = buildSeedGenerationPrompt('foods');
      const unknownPrompt = buildSeedGenerationPrompt('foods', { diversity: 'unknown' });
      expect(unknownPrompt).toBe(defaultPrompt);
    }
  },
});
