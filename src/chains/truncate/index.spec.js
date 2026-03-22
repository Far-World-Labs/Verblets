import { describe, expect, it, vi, beforeEach } from 'vitest';
import truncate from './index.js';

vi.mock('../score/index.js', () => ({
  default: vi.fn(),
  scoreItem: vi.fn(),
}));

import score from '../score/index.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('truncate', () => {
  it('returns full length when all chunks score above threshold', async () => {
    score.mockResolvedValueOnce([8, 7, 9]);
    const text = 'All content is important and should stay.';
    const result = await truncate(text, 'Remove boring content');
    expect(result).toBe(text.length);
  });

  it('truncates when a chunk from the end scores below threshold', async () => {
    // Chunks scored in reverse (end → start). Score of 3 < default threshold 6.
    score.mockResolvedValueOnce([3]);
    const text = 'Important content at the beginning. Less important content at the end.';
    const result = await truncate(text, 'Remove boring content');
    expect(result).toBeLessThan(text.length);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('strictness option controls the removal threshold', async () => {
    // All scores are 5 — below high strictness (7), but above low strictness (4)
    score.mockResolvedValueOnce([5, 5, 5]);
    const text = 'Short test text.';

    const highResult = await truncate(text, 'criteria', { strictness: 'high' });
    // With high strictness (threshold 7), score 5 < 7 triggers removal
    expect(highResult).toBeLessThan(text.length);

    score.mockResolvedValueOnce([5, 5, 5]);
    const lowResult = await truncate(text, 'criteria', { strictness: 'low' });
    // With low strictness (threshold 4), score 5 > 4 keeps everything
    expect(lowResult).toBe(text.length);
  });

  it('accepts raw number for strictness', async () => {
    score.mockResolvedValueOnce([5, 5, 5]);
    const text = 'Short test text.';
    const result = await truncate(text, 'criteria', { strictness: 3 });
    // Score 5 > threshold 3, keeps everything
    expect(result).toBe(text.length);
  });

  it('forwards config to score chain', async () => {
    score.mockResolvedValueOnce([8]);
    await truncate('Test text', 'Remove boring content', {
      llm: 'custom-model',
      customOption: 'value',
    });

    expect(score).toHaveBeenCalledWith(
      expect.any(Array),
      expect.stringContaining('Remove boring content'),
      expect.objectContaining({
        llm: 'custom-model',
        customOption: 'value',
      })
    );
  });

  it('handles single-chunk text', async () => {
    score.mockResolvedValueOnce([8]);
    const result = await truncate('Hi', 'Remove boring content');
    expect(result).toBe(2);
  });
});
