import { beforeEach, describe, expect, it, vi } from 'vitest';
import bulkMap, { bulkMapRetry } from './index.js';
import listMap from '../../verblets/list-map/index.js';

vi.mock('../../verblets/list-map/index.js', () => ({
  default: vi.fn(async (items, instructions) => {
    if (items.includes('FAIL')) throw new Error('fail');
    return items.map((i) => `${i}-${instructions}`);
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('bulkmap', () => {
  it('maps fragments in batches', async () => {
    const result = await bulkMap(['a', 'b', 'c'], 'x', { chunkSize: 2 });
    expect(result).toStrictEqual(['a-x', 'b-x', 'c-x']);
    expect(listMap).toHaveBeenCalledTimes(2);
  });

  it('leaves undefined on error', async () => {
    listMap.mockRejectedValueOnce(new Error('fail'));
    const result = await bulkMap(['FAIL', 'oops'], 'x', { chunkSize: 2 });
    expect(result).toStrictEqual([undefined, undefined]);
  });

  it('retries only failed fragments', async () => {
    let call = 0;
    listMap.mockImplementation(async (items) => {
      call += 1;
      if (call === 1) throw new Error('fail');
      return items.map((l) => l.toUpperCase());
    });

    const result = await bulkMapRetry(['alpha', 'beta'], 'upper', {
      chunkSize: 2,
      maxAttempts: 2,
    });
    expect(result).toStrictEqual(['ALPHA', 'BETA']);
    expect(listMap).toHaveBeenCalledTimes(2);
  });
});
