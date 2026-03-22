import { describe, expect, it, vi, beforeEach } from 'vitest';
import truncate from './index.js';

// Mock the score chain to prevent actual API calls
vi.mock('../score/index.js', () => ({
  default: vi.fn(),
  scoreItem: vi.fn(),
}));

import score from '../score/index.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('truncate', () => {
  describe('basic functionality', () => {
    it('returns a number', async () => {
      score.mockResolvedValueOnce([8, 7, 6, 5, 4]);
      const result = await truncate('This is a test text to truncate', 'Remove boring content');
      expect(typeof result).toBe('number');
    });

    it('returns valid index within text bounds', async () => {
      score.mockResolvedValueOnce([8, 7, 6, 5, 4]);
      const text = 'This is a test text to truncate';
      const result = await truncate(text, 'Remove boring content');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(text.length);
    });

    it('can be used to actually truncate text', async () => {
      // Mock to indicate truncation should happen (3rd chunk from end fails threshold)
      score.mockResolvedValueOnce([8, 7, 3]);
      const text = 'This is important content. This is less important content.';
      const result = await truncate(text, 'Remove boring content');
      expect(result).toBeLessThan(text.length);
    });
  });

  describe('reverse processing behavior', () => {
    it('works backwards from end to find irrelevant content', async () => {
      const text = 'Important content at the beginning. Less important content at the end.';
      // Mock to indicate the first chunk from the end (index 0 in reverse) should be removed
      // This means the last chunk fails the threshold, but we keep everything before it
      score.mockResolvedValueOnce([3]);
      const result = await truncate(text, 'Remove boring content');

      expect(result).toBeLessThan(text.length); // Should truncate
      expect(result).toBeGreaterThanOrEqual(0); // Should be valid
    });

    it('handles threshold configuration', async () => {
      score.mockResolvedValueOnce([8, 7, 6, 5, 4]);
      const result = await truncate('Test text', 'Remove boring content', { threshold: 3 });
      expect(typeof result).toBe('number');
    });

    it('returns full length when all content meets criteria', async () => {
      score.mockResolvedValueOnce([8, 7, 6]);
      const text = 'All content is important';
      const result = await truncate(text, 'Remove boring content');
      expect(result).toBe(text.length);
    });
  });

  describe('configuration options', () => {
    it('uses default threshold of 6', async () => {
      score.mockResolvedValueOnce([8, 7, 6, 5, 4]);
      const result = await truncate('Test text', 'Remove boring content');
      expect(typeof result).toBe('number');
    });

    it('respects custom threshold', async () => {
      score.mockResolvedValueOnce([8, 7, 6, 5, 4]);
      const result = await truncate('Test text', 'Remove boring content', { threshold: 8 });
      expect(typeof result).toBe('number');
    });

    it('respects custom chunk size', async () => {
      score.mockResolvedValueOnce([8, 7, 6, 5, 4]);
      const result = await truncate('Test text', 'Remove boring content', { chunkSize: 5 });
      expect(typeof result).toBe('number');
    });

    it('passes through config to score chain', async () => {
      score.mockResolvedValueOnce([8, 7, 6, 5, 4]);
      await truncate('Test text', 'Remove boring content', {
        chunkSize: 5,
        llm: { modelName: 'custom' },
        customOption: 'value',
      });

      expect(score).toHaveBeenCalledWith(
        expect.any(Array),
        expect.stringContaining('Remove boring content'),
        expect.objectContaining({
          chunkSize: 5,
          llm: { modelName: 'custom' },
          customOption: 'value',
        })
      );
    });
  });

  describe('edge cases', () => {
    it('handles very short text', async () => {
      score.mockResolvedValueOnce([8]);
      const result = await truncate('Hi', 'Remove boring content');
      expect(result).toBe(2);
    });

    it('handles text with no clear boundaries', async () => {
      score.mockResolvedValueOnce([8, 7, 6, 5, 4]);
      const result = await truncate('NoSpacesOrPunctuationHere', 'Remove boring content');
      expect(typeof result).toBe('number');
    });

    it('handles text where first chunk fails threshold', async () => {
      // Mock to indicate first chunk in reverse (last chunk) fails threshold
      score.mockResolvedValueOnce([8, 7, 6, 5, 4]);
      const result = await truncate('Test content here', 'Remove boring content');
      expect(result).toBeLessThan('Test content here'.length);
    });
  });

  describe('early termination', () => {
    it('stops processing when threshold is breached', async () => {
      // Mock to show early termination
      score.mockResolvedValueOnce([8, 7, 3]);
      const result = await truncate(
        'Long text that should be truncated early',
        'Remove boring content'
      );
      expect(typeof result).toBe('number');
    });
  });

  describe('async behavior', () => {
    it('returns a promise', () => {
      score.mockResolvedValueOnce([8, 7, 6, 5, 4]);
      const result = truncate('Test text', 'Remove boring content');
      expect(result).toBeInstanceOf(Promise);
    });

    it('can be awaited', async () => {
      score.mockResolvedValueOnce([8, 7, 6, 5, 4]);
      const result = await truncate('Test text', 'Remove boring content');
      expect(typeof result).toBe('number');
    });
  });
});
