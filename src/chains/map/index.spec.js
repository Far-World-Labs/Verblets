import { beforeEach, describe, expect, it, vi } from 'vitest';
import map from './index.js';
import listMapLines from '../../verblets/list-map-lines/index.js';

vi.mock('../../verblets/list-map-lines/index.js', () => ({
  default: vi.fn(async (items, instructions) => {
    if (items.includes('FAIL')) throw new Error('fail');
    return items.map((i) => `${i}-${instructions}`);
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('map', () => {
  it('maps fragments in batches', async () => {
    const result = await map(['a', 'b', 'c'], 'x', { chunkSize: 2 });
    expect(result).toStrictEqual(['a-x', 'b-x', 'c-x']);
    expect(listMapLines).toHaveBeenCalledTimes(2);
  });

  it('leaves undefined on error', async () => {
    listMapLines.mockRejectedValueOnce(new Error('fail'));
    const result = await map(['FAIL', 'oops'], 'x', { chunkSize: 2 });
    expect(result).toStrictEqual([undefined, undefined]);
  });

  it('retries only failed fragments', async () => {
    let call = 0;
    listMapLines.mockImplementation(async (items) => {
      call += 1;
      if (call === 1) throw new Error('fail');
      return items.map((l) => l.toUpperCase());
    });

    const result = await map(['alpha', 'beta'], 'upper', {
      chunkSize: 2,
      maxAttempts: 2,
    });
    expect(result).toStrictEqual(['ALPHA', 'BETA']);
    expect(listMapLines).toHaveBeenCalledTimes(2);
  });

  it('retries multiple times', async () => {
    let call = 0;
    listMapLines.mockImplementation(async (items) => {
      call += 1;
      if (call === 1) throw new Error('fail');
      if (call === 2) throw new Error('fail');
      return items.map((l) => l.toUpperCase());
    });

    const result = await map(['alpha', 'beta'], 'upper', {
      chunkSize: 2,
      maxAttempts: 3,
    });
    expect(result).toStrictEqual(['ALPHA', 'BETA']);
    expect(listMapLines).toHaveBeenCalledTimes(3);
  });
});
