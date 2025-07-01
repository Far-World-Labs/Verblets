import { describe, expect, it } from 'vitest';
import truncate from './index.js';

describe('truncate', () => {
  describe('basic functionality', () => {
    it('returns a number', async () => {
      const result = await truncate('Test sentence. Another sentence.', 'find best cut');
      expect(typeof result).toBe('number');
    });

    it('returns valid index within text bounds', async () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const result = await truncate(text, 'keep important parts');
      
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(text.length);
    });

    it('can be used to actually truncate text', async () => {
      const text = 'Introduction here. Main content follows. Conclusion at end.';
      const cutPoint = await truncate(text, 'focus on main content');
      
      const truncated = text.slice(0, cutPoint);
      expect(truncated.length).toBe(cutPoint);
    });
  });

  describe('scoring integration', () => {
    it('uses score chain for evaluation', async () => {
      const text = 'Important first part. Less important second part. Filler third part.';
      const result = await truncate(text, 'prioritize important content', { 
        chunkSize: 3
      });
      
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('passes config to score chain', async () => {
      const text = 'Technical details here. User guide follows. Appendix at end.';
      const result = await truncate(text, 'keep technical content', {
        llm: { temperature: 0.1 },
        chunkSize: 2
      });
      
      expect(typeof result).toBe('number');
    });
  });

  describe('sentence boundary handling', () => {
    it('works with single sentence', async () => {
      const text = 'Just one sentence here.';
      const result = await truncate(text, 'find best cut');
      
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(text.length);
    });

    it('handles multiple sentences', async () => {
      const text = 'First. Second! Third?';
      const result = await truncate(text, 'keep best parts');
      
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(text.length);
    });

    it('handles sentences with different punctuation', async () => {
      const text = 'Statement one. Question two? Exclamation three!';
      const result = await truncate(text, 'find optimal point');
      
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(text.length);
    });
  });

  describe('instruction following', () => {
    it('follows specific content instructions', async () => {
      const text = 'Background info. Key findings. Methodology details.';
      const result = await truncate(text, 'focus on key findings only');
      
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('handles different instruction styles', async () => {
      const text = 'Part A content. Part B content. Part C content.';
      const result = await truncate(text, 'keep Part B');
      
      expect(typeof result).toBe('number');
    });
  });

  describe('async behavior', () => {
    it('returns a promise', () => {
      const result = truncate('test sentence.', 'find cut point');
      expect(result).toBeInstanceOf(Promise);
    });

    it('can be awaited', async () => {
      const result = await truncate('test sentence here.', 'find best cut');
      expect(typeof result).toBe('number');
    });
  });
});