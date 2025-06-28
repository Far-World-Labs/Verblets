import { beforeEach, describe, expect, it, vi } from 'vitest';
import filterAmbiguous from './index.js';
import score from '../score/index.js';
import list from '../list/index.js';

vi.mock('../score/index.js');

vi.mock('../list/index.js', () => ({
  default: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('filterAmbiguous chain', () => {
  it('returns scored ambiguous terms', async () => {
    score
      .mockResolvedValueOnce({ scores: [1, 9], reference: [] })
      .mockResolvedValueOnce({ scores: [8, 3], reference: [] });
    list.mockResolvedValueOnce(['alpha', 'beta']).mockResolvedValueOnce([]);

    const result = await filterAmbiguous('s1\ns2', { topN: 1 });

    expect(result).toStrictEqual([{ term: 'alpha', sentence: 's2', score: 8 }]);
    expect(score).toHaveBeenCalled();
    expect(list).toHaveBeenCalled();
  });
});
