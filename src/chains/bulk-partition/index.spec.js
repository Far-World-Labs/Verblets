import { describe, expect, it, vi, beforeEach } from 'vitest';
import bulkPartition from './index.js';
import listPartition from '../../verblets/list-partition/index.js';
import bulkReduce from '../bulk-reduce/index.js';

vi.mock('../../verblets/list-partition/index.js', () => ({
  default: vi.fn(async (items) => {
    const result = {};
    items.forEach((item) => {
      const key = item.length % 2 ? 'odd' : 'even';
      if (!result[key]) result[key] = [];
      result[key].push(item);
    });
    return result;
  }),
}));

vi.mock('../bulk-reduce/index.js', () => ({
  default: vi.fn(async () => 'odd, even'),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('bulk-partition chain', () => {
  it('partitions in batches', async () => {
    const items = ['a', 'bb', 'ccc', 'dddd'];
    const result = await bulkPartition(items, 'odd or even', {
      chunkSize: 2,
      topN: 2,
    });
    expect(result).toStrictEqual({ odd: ['a', 'ccc'], even: ['bb', 'dddd'] });
    expect(bulkReduce).toHaveBeenCalled();
    expect(listPartition).toHaveBeenCalledTimes(2);
  });
});
