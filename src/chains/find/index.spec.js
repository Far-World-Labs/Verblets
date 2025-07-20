import { beforeEach, describe, expect, it, vi } from 'vitest';
import find from './index.js';
import listBatch from '../../verblets/list-batch/index.js';

vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(async (items) => {
    // Simulate finding the "best" item (last one in this case)
    // For find, we return a single item in the array
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

describe('find chain', () => {
  it('scans batches to find best item', async () => {
    // Mock will return 'b' from first batch ['a', 'b'] and 'd' from second batch ['c', 'd']
    // Since 'b' appears first in the original list, it should be returned
    const result = await find(['a', 'b', 'c', 'd'], 'find', { batchSize: 2 });
    expect(result).toBe('b'); // First valid result found
    expect(listBatch).toHaveBeenCalledTimes(2);
  });

  it('retries on failure', async () => {
    let callCount = 0;
    listBatch.mockImplementation(async (items) => {
      callCount++;
      if (callCount === 1) {
        throw new Error('fail');
      }
      return [items[items.length - 1]];
    });

    const result = await find(['x', 'y'], 'find', { batchSize: 2 });
    expect(result).toBe('y');
    expect(listBatch).toHaveBeenCalledTimes(2);
  });
});
