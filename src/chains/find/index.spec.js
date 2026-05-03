import { beforeEach, expect, vi } from 'vitest';
import find, { findParallel } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import bool from '../../verblets/bool/index.js';
import { runTable, equals, all } from '../../lib/examples-runner/index.js';

vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(async (items) => [items[items.length - 1]]),
  ListStyle: { AUTO: 'auto', XML: 'xml', NEWLINE: 'newline' },
  determineStyle: vi.fn(() => 'newline'),
}));

vi.mock('../../verblets/bool/index.js', () => ({ default: vi.fn() }));

vi.mock('../../lib/text-batch/index.js', () => ({
  default: vi.fn((items, config) => {
    const batchSize = config?.batchSize || 10;
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push({ items: items.slice(i, i + batchSize), startIndex: i });
    }
    return batches;
  }),
}));

beforeEach(() => vi.clearAllMocks());

// ─── batched form ─────────────────────────────────────────────────────────

const findExamples = [
  {
    name: 'scans batches to find best item',
    inputs: { list: ['a', 'b', 'c', 'd'], instructions: 'find', options: { batchSize: 2 } },
    check: all(equals('b'), () => expect(listBatch).toHaveBeenCalledTimes(2)),
  },
  {
    name: 'returns empty string when no item matches',
    inputs: {
      list: ['a', 'b'],
      instructions: 'find nothing',
      options: { batchSize: 10 },
      preMock: () => listBatch.mockResolvedValueOnce([]),
    },
    check: equals(''),
  },
  {
    name: 'earliest match wins across parallel batches',
    inputs: {
      list: ['a', 'b'],
      instructions: 'find',
      options: { batchSize: 1, maxParallel: 2 },
    },
    check: equals('a'),
  },
  {
    name: 'silently continues when a batch throws',
    inputs: {
      list: ['a', 'b'],
      instructions: 'find',
      options: { batchSize: 1, maxParallel: 1 },
      preMock: () =>
        listBatch.mockRejectedValueOnce(new Error('batch failed')).mockResolvedValueOnce(['found']),
    },
    check: equals('found'),
  },
];

runTable({
  describe: 'find chain',
  examples: findExamples,
  process: async ({ list, instructions, options, preMock }) => {
    if (preMock) preMock();
    return find(list, instructions, options);
  },
});

// ─── parallel form ────────────────────────────────────────────────────────

const parallelExamples = [
  {
    name: 'returns the earliest matching item by index',
    inputs: {
      list: ['a', 'b', 'c'],
      preMock: () =>
        vi
          .mocked(bool)
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true),
    },
    check: equals('b'),
  },
  {
    name: 'returns empty string when nothing matches',
    inputs: {
      list: ['a', 'b'],
      preMock: () => vi.mocked(bool).mockResolvedValue(false),
    },
    check: equals(''),
  },
  {
    name: 'terminates early once a chunk produces a match',
    inputs: {
      list: ['a', 'b', 'c', 'd'],
      options: { maxParallel: 2 },
      preMock: () => vi.mocked(bool).mockResolvedValueOnce(true).mockResolvedValueOnce(false),
    },
    check: all(equals('a'), () => expect(bool).toHaveBeenCalledTimes(2)),
  },
  {
    name: 'throws when list is not an array',
    inputs: { list: 'not-an-array' },
    check: ({ error }) => expect(error?.message).toMatch(/must be an array/),
  },
];

runTable({
  describe: 'findParallel',
  examples: parallelExamples,
  process: async ({ list, options, preMock }) => {
    if (preMock) preMock();
    return findParallel(list, 'criteria', options);
  },
});
