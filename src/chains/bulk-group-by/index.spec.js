import { describe, expect, it, vi, beforeEach } from 'vitest';
import bulkGroupBy from './index.js';
import listGroupBy from '../../verblets/list-group-by/index.js';

vi.mock('../../verblets/list-group-by/index.js', () => ({
  default: vi.fn(async (items) => {
    const groups = {};
    items.forEach((item) => {
      const key = item[0];
      groups[key] = groups[key] || [];
      groups[key].push(item);
    });
    return groups;
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('bulk-group-by chain', () => {
  it('groups items across batches', async () => {
    const result = await bulkGroupBy(['alpha', 'beta', 'aardvark'], 'group', { chunkSize: 2 });
    expect(result).toStrictEqual({ a: ['alpha', 'aardvark'], b: ['beta'] });
    expect(listGroupBy).toHaveBeenCalledTimes(2);
  });
});
