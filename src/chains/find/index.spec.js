import { beforeEach, expect, vi } from 'vitest';
import find, { findParallel } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import bool from '../../verblets/bool/index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

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

runTable({
  describe: 'find chain',
  examples: [
    {
      name: 'scans batches to find best item',
      inputs: { list: ['a', 'b', 'c', 'd'], instructions: 'find', options: { batchSize: 2 } },
      want: { value: 'b', batchCalls: 2 },
    },
    {
      name: 'returns empty string when no item matches',
      inputs: { list: ['a', 'b'], instructions: 'find nothing', options: { batchSize: 10 } },
      mocks: { listBatch: [[]] },
      want: { value: '' },
    },
    {
      name: 'earliest match wins across parallel batches',
      inputs: {
        list: ['a', 'b'],
        instructions: 'find',
        options: { batchSize: 1, maxParallel: 2 },
      },
      want: { value: 'a' },
    },
    {
      name: 'silently continues when a batch throws',
      inputs: {
        list: ['a', 'b'],
        instructions: 'find',
        options: { batchSize: 1, maxParallel: 1 },
      },
      mocks: { listBatch: [new Error('batch failed'), ['found']] },
      want: { value: 'found' },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { listBatch });
    return find(inputs.list, inputs.instructions, inputs.options);
  },
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    if ('batchCalls' in want) expect(listBatch).toHaveBeenCalledTimes(want.batchCalls);
  },
});

runTable({
  describe: 'findParallel — result',
  examples: [
    {
      name: 'returns the earliest matching item by index',
      inputs: { list: ['a', 'b', 'c'] },
      mocks: { bool: [false, true, true] },
      want: { value: 'b' },
    },
    {
      name: 'returns empty string when nothing matches',
      inputs: { list: ['a', 'b'] },
      mocks: { bool: [false, false] },
      want: { value: '' },
    },
    {
      name: 'terminates early once a chunk produces a match',
      inputs: { list: ['a', 'b', 'c', 'd'], options: { maxParallel: 2 } },
      mocks: { bool: [true, false] },
      want: { value: 'a', boolCalls: 2 },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { bool });
    return findParallel(inputs.list, 'criteria', inputs.options);
  },
  expects: ({ result, want }) => {
    expect(result).toEqual(want.value);
    if ('boolCalls' in want) expect(bool).toHaveBeenCalledTimes(want.boolCalls);
  },
});

runTable({
  describe: 'findParallel — validation',
  examples: [
    {
      name: 'throws when list is not an array',
      inputs: { list: 'not-an-array' },
      want: { throws: /must be an array/ },
    },
  ],
  process: async ({ inputs }) => findParallel(inputs.list, 'criteria'),
  expects: ({ error, want }) => {
    expect(error?.message).toMatch(want.throws);
  },
});
