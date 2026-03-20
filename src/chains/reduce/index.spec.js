import { beforeEach, describe, expect, it, vi } from 'vitest';
import { testLifecycleLogger } from '../../lib/test-utils/index.js';
import reduce from './index.js';
import listBatch from '../../verblets/list-batch/index.js';

vi.mock('../../lib/text-batch/index.js', () => ({
  default: vi.fn((list) => {
    // Simple batching for tests
    const batches = [];
    for (let i = 0; i < list.length; i += 2) {
      const items = list.slice(i, i + 2);
      batches.push({ items, startIndex: i });
    }
    return batches;
  }),
}));

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => fn()),
}));

vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(async (items, instructions) => {
    // Simulate reduce behavior: take accumulator from instructions and append items
    const instructionText =
      typeof instructions === 'function'
        ? instructions({ style: 'newline', count: items.length })
        : instructions;

    // Extract accumulator from the instruction text (simplified for test)
    const accMatch = instructionText.match(/<accumulator>(.*?)<\/accumulator>/s);
    let acc = accMatch ? accMatch[1].trim() : '';

    // Handle the "No initial value" case
    if (acc.includes('No initial value')) {
      acc = '';
    }

    const result = [acc, ...items].filter(Boolean).join('-');
    return { accumulator: result };
  }),
  ListStyle: {
    NEWLINE: 'newline',
    XML: 'xml',
    AUTO: 'auto',
  },
  determineStyle: vi.fn(() => 'newline'),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('reduce chain', () => {
  it('reduces in batches', async () => {
    const result = await reduce(['a', 'b', 'c', 'd'], 'join', { batchSize: 2 });
    expect(result).toBe('a-b-c-d');
    expect(listBatch).toHaveBeenCalledTimes(2);
  });

  it('uses initial value', async () => {
    const result = await reduce(['x', 'y'], 'join', { initial: '0', batchSize: 2 });
    expect(result).toBe('0-x-y');
    expect(listBatch).toHaveBeenCalledTimes(1);
  });

  describe('reduce.with', () => {
    it('returns a function', () => {
      const fn = reduce.with('join values');
      expect(typeof fn).toBe('function');
    });

    it('reduces with accumulator', async () => {
      const fn = reduce.with('join');
      const result = await fn('start', 'next');
      expect(result).toBe('start-next');
      expect(listBatch).toHaveBeenCalledTimes(1);
      expect(listBatch).toHaveBeenCalledWith(['next'], expect.any(String), expect.any(Object));
    });
  });

  describe('custom responseFormat', () => {
    const statsFormat = {
      type: 'json_schema',
      json_schema: {
        name: 'stats',
        schema: {
          type: 'object',
          properties: {
            sum: { type: 'number' },
            count: { type: 'number' },
          },
          required: ['sum', 'count'],
          additionalProperties: false,
        },
      },
    };

    it('returns result directly without unwrapping accumulator', async () => {
      listBatch.mockResolvedValueOnce({ sum: 10, count: 2 });
      const result = await reduce(['a', 'b'], 'sum values', {
        batchSize: 2,
        responseFormat: statsFormat,
        initial: { sum: 0, count: 0 },
      });
      expect(result).toEqual({ sum: 10, count: 2 });
    });

    it('passes custom responseFormat through to listBatch', async () => {
      listBatch.mockResolvedValueOnce({ sum: 5, count: 1 });
      await reduce(['a'], 'sum', { batchSize: 2, responseFormat: statsFormat });
      const callConfig = listBatch.mock.calls[0][2];
      expect(callConfig.responseFormat).toBe(statsFormat);
    });

    it('chains accumulator across batches with custom format', async () => {
      listBatch
        .mockResolvedValueOnce({ sum: 3, count: 2 })
        .mockResolvedValueOnce({ sum: 8, count: 4 });
      const result = await reduce(['a', 'b', 'c', 'd'], 'sum values', {
        batchSize: 2,
        responseFormat: statsFormat,
        initial: { sum: 0, count: 0 },
      });
      // Second batch gets the first batch's result as accumulator
      expect(result).toEqual({ sum: 8, count: 4 });
      expect(listBatch).toHaveBeenCalledTimes(2);
      const secondCallPrompt = listBatch.mock.calls[1][1];
      expect(secondCallPrompt).toContain('"sum":');
    });
  });

  testLifecycleLogger('to listBatch', {
    invoke: (config) => reduce(['a', 'b'], 'join', { batchSize: 2, ...config }),
    setupMocks: () => {},
    target: { mock: listBatch, argIndex: 2 },
  });

  it('uses initial value with more elements', async () => {
    const result = await reduce(['x', 'y', 'z'], 'join', { initial: '0', batchSize: 2 });
    expect(result).toBe('0-x-y-z');
    expect(listBatch).toHaveBeenCalledTimes(2);
  });
});
