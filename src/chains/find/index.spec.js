import { beforeEach, describe, expect, it, vi } from 'vitest';
import { testForwardsConfig, testLifecycleLogger } from '../../lib/test-utils/index.js';
import find from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import retry from '../../lib/retry/index.js';

vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(async (items) => {
    return [items[items.length - 1]];
  }),
  ListStyle: { AUTO: 'auto', XML: 'xml', NEWLINE: 'newline' },
  determineStyle: vi.fn(() => 'newline'),
}));

vi.mock('../../lib/text-batch/index.js', () => ({
  default: vi.fn((items, config) => {
    const batchSize = config?.batchSize || 10;
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push({ items: items.slice(i, i + batchSize), startIndex: i, skip: false });
    }
    return batches;
  }),
}));

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => fn()),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('find chain', () => {
  it('scans batches to find best item', async () => {
    const result = await find(['a', 'b', 'c', 'd'], 'find', { batchSize: 2 });
    expect(result).toBe('b');
    expect(listBatch).toHaveBeenCalledTimes(2);
  });

  it('returns empty string when no item matches', async () => {
    listBatch.mockResolvedValueOnce([]);
    const result = await find(['a', 'b'], 'find nothing', { batchSize: 10 });
    expect(result).toBe('');
  });

  it('forwards maxAttempts to retry via config', async () => {
    await find(['a', 'b'], 'find a', { batchSize: 10, maxAttempts: 7 });
    const retryOpts = retry.mock.calls[0][1];
    expect(retryOpts.config).toBeDefined();
    expect(retryOpts.config.maxAttempts).toBe(7);
  });

  it('passes config to retry for default resolution', async () => {
    await find(['a', 'b'], 'find a', { batchSize: 10 });
    const retryOpts = retry.mock.calls[0][1];
    expect(retryOpts.config).toBeDefined();
    expect(retryOpts.maxAttempts).toBeUndefined();
  });

  testForwardsConfig('forwards config to listBatch', {
    invoke: (config) => find(['a'], 'find', { batchSize: 10, ...config }),
    setupMocks: () => {},
    target: { mock: listBatch, argIndex: 2 },
    options: {
      llm: { value: { model: 'test-model' } },
    },
  });

  testLifecycleLogger('to listBatch', {
    invoke: (config) => find(['a', 'b'], 'find a', { batchSize: 10, ...config }),
    setupMocks: () => {},
    target: { mock: listBatch, argIndex: 2 },
  });

  it('returns earliest match when multiple batches find results', async () => {
    // With batchSize=1 and maxParallel=2, both batches run in parallel
    // 'a' at index 0 should win over 'b' at index 1
    const result = await find(['a', 'b'], 'find', { batchSize: 1, maxParallel: 2 });
    expect(result).toBe('a');
  });

  it('silently continues when a batch throws', async () => {
    listBatch.mockRejectedValueOnce(new Error('batch failed')).mockResolvedValueOnce(['found']);

    const result = await find(['a', 'b'], 'find', { batchSize: 1, maxParallel: 1 });
    expect(result).toBe('found');
  });
});
