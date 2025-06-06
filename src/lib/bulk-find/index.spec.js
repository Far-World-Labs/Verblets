import { describe, expect, it, vi, beforeEach } from 'vitest';
import bulkFind, { bulkFindRetry } from './index.js';
import listFind from '../../verblets/list-find/index.js';

vi.mock('../../verblets/list-find/index.js', () => ({
  default: vi.fn(async (list, instructions) => list.find((l) => l.includes(instructions)) || ''),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('bulk-find', () => {
  it('returns first match across batches', async () => {
    const result = await bulkFind(['a', 'b', 'c', 'd'], 'c', 2);
    expect(result).toBe('c');
    expect(listFind).toHaveBeenCalledTimes(2);
  });

  it('returns undefined when not found', async () => {
    listFind.mockResolvedValueOnce('');
    listFind.mockResolvedValueOnce('');
    const result = await bulkFind(['a', 'b'], 'x', 1);
    expect(result).toBeUndefined();
  });

  it('retries until a match is found', async () => {
    listFind.mockResolvedValueOnce('');
    listFind.mockResolvedValueOnce('c');
    const result = await bulkFindRetry(['a', 'b', 'c'], 'c', { chunkSize: 2, maxAttempts: 2 });
    expect(result).toBe('c');
    expect(listFind).toHaveBeenCalledTimes(2);
  });

  it('returns undefined after maxAttempts', async () => {
    listFind.mockResolvedValue('');
    const result = await bulkFindRetry(['a', 'b'], 'x', { chunkSize: 1, maxAttempts: 2 });
    expect(result).toBeUndefined();
    expect(listFind).toHaveBeenCalledTimes(4);
  });
});
