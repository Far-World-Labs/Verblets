import { beforeEach, describe, expect, it, vi } from 'vitest';
import find from './index.js';
import listFindLines from '../../verblets/list-find-lines/index.js';

vi.mock('../../verblets/list-find-lines/index.js', () => ({
  default: vi.fn(async (items) => items[items.length - 1]),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('find chain', () => {
  it('scans batches to find best item', async () => {
    const result = await find(['a', 'b', 'c', 'd'], 'find', { chunkSize: 2 });
    expect(result).toBe('d');
    expect(listFindLines).toHaveBeenCalledTimes(2);
  });

  it('retries on failure', async () => {
    listFindLines.mockRejectedValueOnce(new Error('fail'));
    const result = await find(['x', 'y'], 'find', { chunkSize: 2, maxAttempts: 2 });
    expect(result).toBe('y');
    expect(listFindLines).toHaveBeenCalledTimes(2);
  });
});
