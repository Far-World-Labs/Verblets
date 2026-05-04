import { beforeEach, expect, vi } from 'vitest';
import find, { findParallel } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import bool from '../../verblets/bool/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

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

// ─── batched form ────────────────────────────────────────────────────────

runTable({
  describe: 'find chain',
  examples: [
    {
      name: 'scans batches to find best item',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        instructions: 'find',
        options: { batchSize: 2 },
        want: 'b',
        wantBatchCalls: 2,
      },
    },
    {
      name: 'returns empty string when no item matches',
      inputs: {
        list: ['a', 'b'],
        instructions: 'find nothing',
        options: { batchSize: 10 },
        mock: () => listBatch.mockResolvedValueOnce([]),
        want: '',
      },
    },
    {
      name: 'earliest match wins across parallel batches',
      inputs: {
        list: ['a', 'b'],
        instructions: 'find',
        options: { batchSize: 1, maxParallel: 2 },
        want: 'a',
      },
    },
    {
      name: 'silently continues when a batch throws',
      inputs: {
        list: ['a', 'b'],
        instructions: 'find',
        options: { batchSize: 1, maxParallel: 1 },
        mock: () =>
          listBatch
            .mockRejectedValueOnce(new Error('batch failed'))
            .mockResolvedValueOnce(['found']),
        want: 'found',
      },
    },
  ],
  process: async ({ list, instructions, options, mock }) => {
    if (mock) mock();
    return find(list, instructions, options);
  },
  expects: ({ result, inputs }) => {
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('wantBatchCalls' in inputs) expect(listBatch).toHaveBeenCalledTimes(inputs.wantBatchCalls);
  },
});

// ─── parallel form ───────────────────────────────────────────────────────

runTable({
  describe: 'findParallel — result',
  examples: [
    {
      name: 'returns the earliest matching item by index',
      inputs: {
        list: ['a', 'b', 'c'],
        mock: () =>
          vi
            .mocked(bool)
            .mockResolvedValueOnce(false)
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(true),
        want: 'b',
      },
    },
    {
      name: 'returns empty string when nothing matches',
      inputs: {
        list: ['a', 'b'],
        mock: () => vi.mocked(bool).mockResolvedValue(false),
        want: '',
      },
    },
    {
      name: 'terminates early once a chunk produces a match',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        options: { maxParallel: 2 },
        mock: () => vi.mocked(bool).mockResolvedValueOnce(true).mockResolvedValueOnce(false),
        want: 'a',
        wantBoolCalls: 2,
      },
    },
  ],
  process: async ({ list, options, mock }) => {
    if (mock) mock();
    return findParallel(list, 'criteria', options);
  },
  expects: ({ result, inputs }) => {
    expect(result).toEqual(inputs.want);
    if ('wantBoolCalls' in inputs) expect(bool).toHaveBeenCalledTimes(inputs.wantBoolCalls);
  },
});

runTable({
  describe: 'findParallel — validation',
  examples: [
    {
      name: 'throws when list is not an array',
      inputs: { list: 'not-an-array', throws: /must be an array/ },
    },
  ],
  process: async ({ list }) => findParallel(list, 'criteria'),
  expects: ({ error, inputs }) => {
    expect(error?.message).toMatch(inputs.throws);
  },
});
