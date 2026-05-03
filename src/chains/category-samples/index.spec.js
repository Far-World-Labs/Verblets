import { vi, beforeEach, expect } from 'vitest';
import categorySamples, { buildSeedGenerationPrompt } from './index.js';
import list from '../list/index.js';
import retry from '../../lib/retry/index.js';
import {
  runTable,
  equals,
  length,
  all,
  throws,
  contains,
} from '../../lib/examples-runner/index.js';

vi.mock('../list/index.js', () => ({ default: vi.fn() }));
vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn(async (fn) => fn()) }));

beforeEach(() => {
  vi.clearAllMocks();
  list.mockResolvedValue(['item-a', 'item-b', 'item-c']);
});

// ─── categorySamples ──────────────────────────────────────────────────────

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
        preMock: () =>
          list.mockResolvedValueOnce(['apple', 'banana', 'cherry', 'date', 'elderberry']),
      },
      check: equals(['apple', 'banana', 'cherry', 'date', 'elderberry']),
    },
    {
      name: 'truncates results to requested count',
      inputs: {
        categoryName: 'things',
        options: { count: 10 },
        preMock: () => list.mockResolvedValueOnce(samples40),
      },
      check: all(length(10), equals(samples40.slice(0, 10))),
    },
    {
      name: 'uses default count of 30',
      inputs: {
        categoryName: 'items',
        preMock: () => list.mockResolvedValueOnce(samples35),
      },
      check: length(30),
    },
    {
      name: 'passes built prompt and shouldStop to list',
      inputs: { categoryName: 'dogs', options: { count: 15 } },
      check: () => {
        const [promptArg, listConfig] = list.mock.calls[0];
        expect(promptArg).toContain('dogs');
        expect(listConfig.shouldStop({ resultsAll: Array(10) })).toBe(false);
        expect(listConfig.shouldStop({ resultsAll: Array(15) })).toBe(true);
        expect(listConfig.shouldStop({ resultsAll: Array(20) })).toBe(true);
      },
    },
    {
      name: 'throws when categoryName is missing',
      inputs: { categoryName: undefined },
      check: throws(/categoryName must be a non-empty string/),
    },
    {
      name: 'throws when categoryName is empty string',
      inputs: { categoryName: '' },
      check: throws(/categoryName must be a non-empty string/),
    },
    {
      name: 'throws when categoryName is a number',
      inputs: { categoryName: 42 },
      check: throws(/categoryName must be a non-empty string/),
    },
    {
      name: 'throws when categoryName is null',
      inputs: { categoryName: null },
      check: throws(/categoryName must be a non-empty string/),
    },
    {
      name: 'throws when list returns empty results',
      inputs: {
        categoryName: 'obscure things',
        preMock: () => list.mockResolvedValueOnce([]),
      },
      check: throws(/No sample items generated for category: obscure things/),
    },
    {
      name: 'throws when list returns null results',
      inputs: {
        categoryName: 'nothing',
        preMock: () => list.mockResolvedValueOnce(null),
      },
      check: throws(/No sample items generated for category: nothing/),
    },
    {
      name: 'propagates errors from list chain through retry',
      inputs: {
        categoryName: 'failing',
        preMock: () => list.mockRejectedValueOnce(new Error('LLM call failed')),
      },
      check: ({ error }) => {
        expect(error?.message).toBe('LLM call failed');
        expect(retry).toHaveBeenCalledTimes(1);
      },
    },
  ],
  process: async ({ categoryName, options, preMock }) => {
    if (preMock) preMock();
    return categorySamples(categoryName, options);
  },
});

// ─── buildSeedGenerationPrompt ────────────────────────────────────────────

runTable({
  describe: 'buildSeedGenerationPrompt',
  examples: [
    {
      name: 'inserts category name and context into prompt',
      inputs: {
        categoryName: 'tropical birds',
        options: { context: 'Focus on endangered species' },
      },
      check: all(contains('tropical birds'), contains('Focus on endangered species')),
    },
    {
      name: 'produces different output for each diversity level',
      inputs: {},
      check: () => {
        const defaultPrompt = buildSeedGenerationPrompt('cars');
        const highPrompt = buildSeedGenerationPrompt('music genres', { diversity: 'high' });
        const lowPrompt = buildSeedGenerationPrompt('sports', { diversity: 'low' });
        expect(defaultPrompt).not.toBe(highPrompt);
        expect(defaultPrompt).not.toBe(lowPrompt);
        expect(highPrompt).not.toBe(lowPrompt);
      },
    },
    {
      name: 'falls back to default for unknown diversity level',
      inputs: {},
      check: () => {
        const defaultPrompt = buildSeedGenerationPrompt('foods');
        const unknownPrompt = buildSeedGenerationPrompt('foods', { diversity: 'unknown' });
        expect(unknownPrompt).toBe(defaultPrompt);
      },
    },
  ],
  process: ({ categoryName, options }) =>
    categoryName ? buildSeedGenerationPrompt(categoryName, options) : undefined,
});
