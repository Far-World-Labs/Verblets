import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('forwards maxAttempts to retry', async () => {
    await find(['a', 'b'], 'find a', { batchSize: 10, maxAttempts: 7 });
    const retryConfig = retry.mock.calls[0][1];
    expect(retryConfig.maxAttempts).toBe(7);
  });

  it('defaults maxAttempts to 3', async () => {
    await find(['a', 'b'], 'find a', { batchSize: 10 });
    const retryConfig = retry.mock.calls[0][1];
    expect(retryConfig.maxAttempts).toBe(3);
  });

  it('forwards llm config to listBatch', async () => {
    const llm = { model: 'test-model' };
    await find(['a'], 'find', { batchSize: 10, llm });
    const callConfig = listBatch.mock.calls[0][2];
    expect(callConfig.llm).toBe(llm);
  });

  it('forwards lifecycle logger to listBatch', async () => {
    const logger = { info: vi.fn(), debug: vi.fn() };
    await find(['a', 'b'], 'find a', { batchSize: 10, logger });
    const callConfig = listBatch.mock.calls[0][2];
    expect(callConfig.logger.logEvent).toBeTypeOf('function');
    expect(callConfig.logger.info).toBe(logger.info);
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
