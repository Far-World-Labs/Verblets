import { beforeEach, describe, expect, it, vi } from 'vitest';
import bulkFind, { bulkFindRetry } from './index.js';
import listFind from '../../verblets/list-find/index.js';

vi.mock('../../verblets/list-find/index.js', () => ({
  default: vi.fn(async (items) => items[items.length - 1]),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('bulk-find chain', () => {
  it('scans batches to find best item', async () => {
    const result = await bulkFind(['a', 'b', 'c', 'd'], 'find', 2);
    expect(result).toBe('d');
    expect(listFind).toHaveBeenCalledTimes(2);
  });

  it('retries on failure', async () => {
    listFind.mockRejectedValueOnce(new Error('fail'));
    const result = await bulkFindRetry(['x', 'y'], 'find', { chunkSize: 2, maxAttempts: 2 });
    expect(result).toBe('y');
    expect(listFind).toHaveBeenCalledTimes(2);
  });
});
