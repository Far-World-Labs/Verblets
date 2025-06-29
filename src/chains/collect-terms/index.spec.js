import { describe, expect, it, beforeEach, vi } from 'vitest';
import collectTerms from './index.js';
import list from '../list/index.js';
import listReduceLines from '../../verblets/list-reduce-lines/index.js';

vi.mock('../list/index.js');
vi.mock('../../verblets/list-reduce-lines/index.js');

beforeEach(() => {
  vi.resetAllMocks();
});

describe('collectTerms chain', () => {
  it('deduplicates and reduces to top terms', async () => {
    list.mockResolvedValueOnce(['alpha', 'beta']).mockResolvedValueOnce(['beta', 'gamma']);
    listReduceLines.mockResolvedValue('alpha, beta, gamma');

    const text = 'p1\n\np2';
    const result = await collectTerms(text, { chunkLen: 2, topN: 2 });

    expect(list).toHaveBeenCalledTimes(2);
    expect(result).toStrictEqual(['alpha', 'beta']);
    expect(listReduceLines).toHaveBeenCalled();
  });
});
