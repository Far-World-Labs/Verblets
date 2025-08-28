import { beforeEach, describe, expect, it, vi } from 'vitest';
import map from './index.js';
import listBatch from '../../verblets/list-batch/index.js';

vi.mock('../../lib/text-batch/index.js', () => ({
  default: vi.fn((list) => {
    // Simple batching for tests
    const batches = [];
    for (let i = 0; i < list.length; i += 2) {
      const items = list.slice(i, i + 2);
      batches.push({ items, startIndex: i });
    }
    return batches;
  }),
}));

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn((fn) => fn()),
}));

vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(async (items, _instructions) => {
    if (items.includes('FAIL')) throw new Error('fail');
    // For tests, just append 'x' to show the transformation worked
    // (the actual prompt content doesn't matter for these tests)
    return items.map((i) => `${i}-x`);
  }),
  ListStyle: {
    NEWLINE: 'newline',
    XML: 'xml',
    AUTO: 'auto',
  },
  determineStyle: vi.fn(() => 'newline'),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('map', () => {
  it('maps fragments in batches', async () => {
    const result = await map(['a', 'b', 'c'], 'x', { batchSize: 2 });
    expect(result).toStrictEqual(['a-x', 'b-x', 'c-x']);
    expect(listBatch).toHaveBeenCalledTimes(2);
  });

  it('leaves undefined on error', async () => {
    listBatch.mockRejectedValueOnce(new Error('fail'));
    const result = await map(['FAIL', 'oops'], 'x', { batchSize: 2 });
    expect(result).toStrictEqual([undefined, undefined]);
  });

  it('retries only failed fragments', async () => {
    let call = 0;
    listBatch.mockImplementation(async (items, _instructions) => {
      call += 1;
      if (call === 1) throw new Error('fail');
      return items.map((l) => l.toUpperCase());
    });

    const result = await map(['alpha', 'beta'], 'upper', {
      batchSize: 2,
      maxAttempts: 2,
    });
    expect(result).toStrictEqual(['ALPHA', 'BETA']);
    expect(listBatch).toHaveBeenCalledTimes(2);
  });

  it('retries multiple times', async () => {
    let call = 0;
    listBatch.mockImplementation(async (items, _instructions) => {
      call += 1;
      if (call === 1) throw new Error('fail');
      if (call === 2) throw new Error('fail');
      return items.map((l) => l.toUpperCase());
    });

    const result = await map(['alpha', 'beta'], 'upper', {
      batchSize: 2,
      maxAttempts: 3,
    });
    expect(result).toStrictEqual(['ALPHA', 'BETA']);
    expect(listBatch).toHaveBeenCalledTimes(3);
  });
});
