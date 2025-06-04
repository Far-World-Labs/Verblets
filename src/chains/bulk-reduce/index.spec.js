import { describe, expect, it, vi, beforeEach } from 'vitest';
import bulkReduce from './index.js';
import listReduce from '../../verblets/list-reduce/index.js';

vi.mock('../../verblets/list-reduce/index.js', () => ({
  default: vi.fn(async (acc, list) => [acc, ...list].filter(Boolean).join('-')),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('bulk-reduce chain', () => {
  it('reduces in batches', async () => {
    const result = await bulkReduce(['a', 'b', 'c', 'd'], 'join', { chunkSize: 2 });
    expect(result).toBe('a-b-c-d');
    expect(listReduce).toHaveBeenCalledTimes(2);
  });

  it('uses initial value', async () => {
    const result = await bulkReduce(['x', 'y'], 'join', { initial: '0', chunkSize: 2 });
    expect(result).toBe('0-x-y');
    expect(listReduce).toHaveBeenCalledTimes(1);
  });
});
