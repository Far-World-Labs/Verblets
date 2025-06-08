import { describe, expect, it, vi, beforeEach } from 'vitest';
import themes from './index.js';
import bulkReduce from '../bulk-reduce/index.js';
import listReduce from '../../verblets/list-reduce/index.js';

vi.mock('../bulk-reduce/index.js', () => ({
  default: vi.fn(async (list, instr, { initial }) => {
    return Array.isArray(JSON.parse(initial || 'null')) ? JSON.stringify([[0, ['a']]]) : 'a, b';
  }),
}));

vi.mock('../../verblets/list-reduce/index.js', () => ({
  default: vi.fn(async () => 'a, b, c'),
}));

describe('themes chain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns array of themes', async () => {
    const result = await themes('some text');
    expect(result).toStrictEqual(['a', 'b', 'c']);
    expect(bulkReduce).toHaveBeenCalled();
    expect(listReduce).toHaveBeenCalled();
  });

  it('maps themes when sentenceMap true', async () => {
    const result = await themes('some text', { sentenceMap: true });
    expect(result).toStrictEqual({
      themes: ['a', 'b', 'c'],
      sentenceThemes: [[0, ['a']]],
    });
    expect(bulkReduce).toHaveBeenCalledTimes(2);
  });
});
