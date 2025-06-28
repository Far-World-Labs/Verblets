import { describe, it, expect, vi, beforeEach } from 'vitest';
import themes from './index.js';
import reduce from '../reduce/index.js';

vi.mock('../reduce/index.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('themes chain', () => {
  it('reduces in two passes', async () => {
    reduce.mockResolvedValueOnce('a, b, c').mockResolvedValueOnce('a, c');
    const text = 'x\n\ny';
    const result = await themes(text, { chunkSize: 1, topN: 2 });
    expect(result).toStrictEqual(['a', 'c']);
    expect(reduce).toHaveBeenCalledTimes(2);
  });
});
