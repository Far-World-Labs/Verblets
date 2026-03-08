import { describe, expect, it } from 'vitest';

import parallelBatch, { parallelMap } from './index.js';

describe('parallelBatch', () => {
  it('processes all items and returns results in order', async () => {
    const items = [1, 2, 3, 4, 5];
    const result = await parallelBatch(items, async (x) => x * 2);
    expect(result).toEqual([2, 4, 6, 8, 10]);
  });

  it('passes item index to processor', async () => {
    const items = ['a', 'b', 'c'];
    const result = await parallelBatch(items, async (item, index) => `${index}:${item}`);
    expect(result).toEqual(['0:a', '1:b', '2:c']);
  });

  it('respects maxParallel concurrency limit', async () => {
    let maxConcurrent = 0;
    let current = 0;

    const items = [1, 2, 3, 4, 5, 6];
    await parallelBatch(
      items,
      async (x) => {
        current++;
        maxConcurrent = Math.max(maxConcurrent, current);
        await new Promise((r) => setTimeout(r, 10));
        current--;
        return x;
      },
      { maxParallel: 2 }
    );

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it('returns empty array for empty input', async () => {
    const result = await parallelBatch([], async (x) => x);
    expect(result).toEqual([]);
  });

  it('returns empty array for non-array input', async () => {
    const result = await parallelBatch(null, async (x) => x);
    expect(result).toEqual([]);
  });

  it('defaults maxParallel to 3', async () => {
    let maxConcurrent = 0;
    let current = 0;

    const items = Array.from({ length: 9 }, (_, i) => i);
    await parallelBatch(items, async (x) => {
      current++;
      maxConcurrent = Math.max(maxConcurrent, current);
      await new Promise((r) => setTimeout(r, 10));
      current--;
      return x;
    });

    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });

  it('handles single item', async () => {
    const result = await parallelBatch([42], async (x) => x + 1);
    expect(result).toEqual([43]);
  });

  it('exports parallelMap as alias', () => {
    expect(parallelMap).toBe(parallelBatch);
  });
});
