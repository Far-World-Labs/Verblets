import { beforeEach, describe, expect, it, vi } from 'vitest';
import filter from './index.js';
import listBatch from '../../verblets/list-batch/index.js';

vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(async (items) => {
    if (items.includes('FAIL')) throw new Error('fail');
    return items.map((item) => (item.includes('a') ? 'yes' : 'no'));
  }),
  ListStyle: { AUTO: 'auto', XML: 'xml', NEWLINE: 'newline' },
  determineStyle: vi.fn(() => 'newline'),
}));

vi.mock('../../lib/text-batch/index.js', () => ({
  default: vi.fn((items, config) => {
    const batchSize = config?.batchSize || 10;
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push({ items: items.slice(i, i + batchSize), skip: false });
    }
    return batches;
  }),
}));

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => {
    try {
      return await fn();
    } catch {
      // Retry once on failure
      return await fn();
    }
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('filter', () => {
  it('filters items in batches', async () => {
    const result = await filter(['a', 'b', 'c'], 'a', { batchSize: 2 });
    expect(result).toStrictEqual(['a']);
    expect(listBatch).toHaveBeenCalledTimes(2);
  });

  it('retries failed batches', async () => {
    let call = 0;
    listBatch.mockImplementation(async (items) => {
      call += 1;
      if (call === 1) throw new Error('fail');
      return items.map((item) => (item.includes('a') ? 'yes' : 'no'));
    });

    const result = await filter(['FAIL', 'a', 'b'], 'a', {
      batchSize: 2,
      maxAttempts: 2,
    });
    expect(result).toStrictEqual(['a']);
    expect(listBatch).toHaveBeenCalledTimes(3);
  });
});
