import { beforeEach, describe, expect, it, vi } from 'vitest';
import filter from './index.js';
import listFilterLines from '../../verblets/list-filter-lines/index.js';

vi.mock('../../verblets/list-filter-lines/index.js', () => ({
  default: vi.fn(async (items, instructions) => {
    if (items.includes('FAIL')) throw new Error('fail');
    return items.filter((l) => l.includes(instructions));
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('filter', () => {
  it('filters items in batches', async () => {
    const result = await filter(['a', 'b', 'c'], 'a', { chunkSize: 2 });
    expect(result).toStrictEqual(['a']);
    expect(listFilterLines).toHaveBeenCalledTimes(2);
  });

  it('retries failed batches', async () => {
    let call = 0;
    listFilterLines.mockImplementation(async (items) => {
      call += 1;
      if (call === 1) throw new Error('fail');
      return items.filter((l) => l.includes('a'));
    });

    const result = await filter(['FAIL', 'a', 'b'], 'a', {
      chunkSize: 2,
      maxAttempts: 2,
    });
    expect(result).toStrictEqual(['a']);
    expect(listFilterLines).toHaveBeenCalledTimes(3);
  });
});
