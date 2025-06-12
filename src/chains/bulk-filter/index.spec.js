import { beforeEach, describe, expect, it, vi } from 'vitest';
import bulkFilter, { bulkFilterRetry } from './index.js';
import listFilter from '../../verblets/list-filter/index.js';

vi.mock('../../verblets/list-filter/index.js', () => ({
  default: vi.fn(async (items, instructions) => {
    if (items.includes('FAIL')) throw new Error('fail');
    return items.filter((l) => l.includes(instructions));
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('bulk-filter', () => {
  it('filters items in batches', async () => {
    const result = await bulkFilter(['a', 'b', 'c'], 'a', { chunkSize: 2 });
    expect(result).toStrictEqual(['a']);
    expect(listFilter).toHaveBeenCalledTimes(2);
  });

  it('retries failed batches', async () => {
    let call = 0;
    listFilter.mockImplementation(async (items) => {
      call += 1;
      if (call === 1) throw new Error('fail');
      return items.filter((l) => l.includes('a'));
    });

    const result = await bulkFilterRetry(['FAIL', 'a', 'b'], 'a', {
      chunkSize: 2,
      maxAttempts: 2,
    });
    expect(result).toStrictEqual(['a']);
    expect(listFilter).toHaveBeenCalledTimes(3);
  });
});
