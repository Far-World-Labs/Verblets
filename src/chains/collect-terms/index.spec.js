import { describe, expect, it, beforeEach, vi } from 'vitest';

// Mock the dependencies before importing the module under test
vi.mock('../list/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../score/index.js', () => ({
  default: vi.fn(),
}));

// Import after mocking
import collectTerms from './index.js';
import list from '../list/index.js';
import score from '../score/index.js';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('collectTerms chain', () => {
  it('deduplicates and reduces to top terms', async () => {
    // Mock list to return terms from different chunks
    list.mockResolvedValueOnce(['alpha', 'beta']).mockResolvedValueOnce(['beta', 'gamma']);

    // Mock score to return scores for the unique terms
    score.mockResolvedValue([8, 9, 7]); // scores for alpha, beta, gamma

    const text = 'p1\n\np2';
    const result = await collectTerms(text, { chunkLen: 2, topN: 2 });

    expect(list).toHaveBeenCalledTimes(2);
    expect(result).toStrictEqual(['beta', 'alpha']); // beta has highest score (9), then alpha (8)
    expect(score).toHaveBeenCalled();
  });
});
