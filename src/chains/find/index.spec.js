import { beforeEach, describe, expect, it, vi } from 'vitest';
import find, { findParallel } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import bool from '../../verblets/bool/index.js';

vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(async (items) => {
    return [items[items.length - 1]];
  }),
  ListStyle: { AUTO: 'auto', XML: 'xml', NEWLINE: 'newline' },
  determineStyle: vi.fn(() => 'newline'),
}));

vi.mock('../../verblets/bool/index.js', () => ({
  default: vi.fn(),
}));

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

describe('findParallel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the earliest matching item by index', async () => {
    vi.mocked(bool)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    const result = await findParallel(['a', 'b', 'c'], 'criteria');
    expect(result).toBe('b');
  });

  it('returns empty string when nothing matches', async () => {
    vi.mocked(bool).mockResolvedValue(false);
    const result = await findParallel(['a', 'b'], 'criteria');
    expect(result).toBe('');
  });

  it('terminates early once a chunk produces a match', async () => {
    vi.mocked(bool).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    // chunk 1 (size 2): 'a','b' — 'a' matches, so chunk 2 should never run
    const result = await findParallel(['a', 'b', 'c', 'd'], 'criteria', { maxParallel: 2 });
    expect(result).toBe('a');
    // bool was called twice for the first chunk and that's it
    expect(bool).toHaveBeenCalledTimes(2);
  });

  it('throws when list is not an array', async () => {
    await expect(findParallel('not-an-array', 'x')).rejects.toThrow(/must be an array/);
  });
});
