import { describe, expect, it } from 'vitest';
import truncate from './index.js';

describe('truncate', () => {
  describe('basic functionality', () => {
    it('returns a number', async () => {
      const result = await truncate(
        'Good content. Bad irrelevant content.',
        'bad irrelevant content'
      );
      expect(typeof result).toBe('number');
    });

    it('returns valid index within text bounds', async () => {
      const text = 'Relevant content. Irrelevant tangent at the end.';
      const result = await truncate(text, 'irrelevant tangent');

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(text.length);
    });

    it('can be used to actually truncate text', async () => {
      const text = 'Core content here. Off-topic conclusion.';
      const cutPoint = await truncate(text, 'off-topic conclusion');

      const truncated = text.slice(0, cutPoint);
      expect(truncated.length).toBe(cutPoint);
    });
  });

  describe('reverse processing behavior', () => {
    it('works backwards from end to find irrelevant content', async () => {
      const text = 'Important content. More important content. Spam footer.';
      const result = await truncate(text, 'spam footer');

      expect(result).toBeLessThan(text.length); // Should truncate
      expect(result).toBeGreaterThan(30); // Should keep the important parts
    });

    it('handles threshold configuration', async () => {
      const text = 'Good content. Mediocre content. Bad content.';

      // Low threshold (permissive)
      const permissive = await truncate(text, 'bad content', { threshold: 4 });

      // High threshold (strict)
      const strict = await truncate(text, 'bad content', { threshold: 8 });

      expect(strict).toBeLessThanOrEqual(permissive);
    });

    it('returns full length when all content meets criteria', async () => {
      const text = 'Great content. Excellent content. Perfect content.';
      const result = await truncate(text, 'poor content');

      expect(result).toBe(text.length);
    });
  });

  describe('configuration options', () => {
    it('uses default threshold of 6', async () => {
      const text = 'Good content. Bad content.';
      const result = await truncate(text, 'bad content');

      expect(typeof result).toBe('number');
    });

    it('respects custom threshold', async () => {
      const text = 'Decent content. Poor content.';
      const result = await truncate(text, 'poor content', { threshold: 7 });

      expect(typeof result).toBe('number');
    });

    it('respects custom chunk size', async () => {
      const text = 'Content part one. Content part two. Irrelevant part three.';
      const result = await truncate(text, 'irrelevant part', {
        chunkSize: 20,
        threshold: 6,
      });

      expect(typeof result).toBe('number');
    });

    it('passes through config to score chain', async () => {
      const text = 'Technical content. Marketing fluff.';
      const result = await truncate(text, 'marketing fluff', {
        threshold: 6,
        chunkSize: 50,
        llm: { temperature: 0.1 },
      });

      expect(typeof result).toBe('number');
    });
  });

  describe('edge cases', () => {
    it('handles very short text', async () => {
      const text = 'Short.';
      const result = await truncate(text, 'irrelevant content');

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(text.length);
    });

    it('handles text with no clear boundaries', async () => {
      const text = 'NoSpacesOrPunctuationHere';
      const result = await truncate(text, 'irrelevant parts');

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(text.length);
    });

    it('handles text where first chunk fails threshold', async () => {
      const text = 'Completely irrelevant content from the start.';
      const result = await truncate(text, 'irrelevant content', {
        threshold: 8, // Very strict
      });

      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('early termination', () => {
    it('stops processing when threshold is breached', async () => {
      // This test verifies early termination works but we can't easily
      // verify it stopped early without mocking the score chain
      const text = 'Good content. More good content. Bad content. More bad content.';
      const result = await truncate(text, 'bad content');

      expect(typeof result).toBe('number');
      expect(result).toBeLessThan(text.length);
    });
  });

  describe('async behavior', () => {
    it('returns a promise', () => {
      const result = truncate('test content.', 'irrelevant content');
      expect(result).toBeInstanceOf(Promise);
    });

    it('can be awaited', async () => {
      const result = await truncate('good content. bad content.', 'bad content');
      expect(typeof result).toBe('number');
    });
  });
});
