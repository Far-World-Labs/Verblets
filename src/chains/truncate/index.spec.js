import { describe, expect, it, vi } from 'vitest';
import truncate from './index.js';

describe('truncate', () => {
  describe('edge cases', () => {
    it('handles null input', async () => {
      const result = await truncate(null, 'find best cut', { limit: 10 });
      expect(result).toEqual({
        truncated: '',
        cutPoint: 0,
        cutType: 'none',
        preservationScore: 0.0,
      });
    });

    it('handles undefined input', async () => {
      const result = await truncate(undefined, 'find best cut', { limit: 10 });
      expect(result).toEqual({
        truncated: '',
        cutPoint: 0,
        cutType: 'none',
        preservationScore: 0.0,
      });
    });

    it('handles empty string', async () => {
      const result = await truncate('', 'find best cut', { limit: 10 });
      expect(result).toEqual({
        truncated: '',
        cutPoint: 0,
        cutType: 'none',
        preservationScore: 0.0,
      });
    });

    it('handles non-string input', async () => {
      const result = await truncate(123, 'find best cut', { limit: 10 });
      expect(result).toEqual({
        truncated: '',
        cutPoint: 0,
        cutType: 'none',
        preservationScore: 0.0,
      });
    });
  });

  describe('full text scenarios', () => {
    it('returns full text when under character limit', async () => {
      const text = 'Short text';
      const result = await truncate(text, 'find best cut', { limit: 100, unit: 'characters' });
      
      expect(result.truncated).toBe(text);
      expect(result.cutType).toBe('full');
      expect(result.preservationScore).toBe(1.0);
      expect(result.cutPoint).toBe(text.length);
    });

    it('returns full text when under word limit', async () => {
      const text = 'Short text here';
      const result = await truncate(text, 'find best cut', { limit: 10, unit: 'words' });
      
      expect(result.truncated).toBe(text);
      expect(result.cutType).toBe('full');
      expect(result.preservationScore).toBe(1.0);
      expect(result.cutPoint).toBe(3);
    });

    it('returns full text when under sentence limit', async () => {
      const text = 'First sentence. Second sentence.';
      const result = await truncate(text, 'find best cut', { limit: 5, unit: 'sentences' });
      
      expect(result.truncated).toBe(text);
      expect(result.cutType).toBe('full');
      expect(result.preservationScore).toBe(1.0);
      expect(result.cutPoint).toBe(2);
    });
  });

  describe('configuration validation', () => {
    it('uses default values when config is empty', async () => {
      const text = 'Test text that should be processed';
      const result = await truncate(text, 'find best cut');
      
      expect(result).toHaveProperty('truncated');
      expect(result).toHaveProperty('cutPoint');
      expect(result).toHaveProperty('cutType');
      expect(result).toHaveProperty('preservationScore');
    });

    it('respects custom limit and unit', async () => {
      const text = 'One two three four five six seven eight nine ten';
      const result = await truncate(text, 'keep important words', { limit: 5, unit: 'words' });
      
      const wordCount = result.truncated.trim().split(/\s+/).filter(Boolean).length;
      expect(wordCount).toBeLessThanOrEqual(5);
    });
  });

  describe('scoring integration', () => {
    it('uses score chain for evaluation', async () => {
      const text = 'Important first sentence. Less important second sentence. Filler third sentence.';
      const result = await truncate(text, 'prioritize important content', { 
        limit: 60,
        chunkSize: 3
      });
      
      expect(result).toHaveProperty('truncated');
      expect(result).toHaveProperty('preservationScore');
      expect(typeof result.preservationScore).toBe('number');
    });

    it('handles scoring failures gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const text = 'Text that will cause scoring to fail';
      const result = await truncate(text, 'find best cut', { 
        limit: 20,
        llm: { modelName: 'invalid-model-that-will-fail' }
      });
      
      expect(result).toHaveProperty('truncated');
      expect(result).toHaveProperty('cutType');
      expect(result.cutType).toBe('fallback');
      
      consoleSpy.mockRestore();
    });
  });

  describe('unit handling', () => {
    it('correctly handles character limits', async () => {
      const text = 'Hello world test';
      const result = await truncate(text, 'find best cut', { limit: 10, unit: 'characters' });
      
      expect(result.truncated.length).toBeLessThanOrEqual(10);
    });

    it('correctly handles word limits', async () => {
      const text = 'One two three four five six';
      const result = await truncate(text, 'find best cut', { limit: 3, unit: 'words' });
      
      const wordCount = result.truncated.trim().split(/\s+/).filter(Boolean).length;
      expect(wordCount).toBeLessThanOrEqual(3);
    });

    it('correctly handles sentence limits', async () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const result = await truncate(text, 'find best cut', { limit: 2, unit: 'sentences' });
      
      const sentenceCount = result.truncated.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
      expect(sentenceCount).toBeLessThanOrEqual(2);
    });
  });

  describe('fallback behavior', () => {
    it('provides fallback when no viable chunks exist', async () => {
      const text = 'Very long single sentence without proper punctuation that exceeds limits';
      const result = await truncate(text, 'find best cut', { limit: 5, unit: 'characters' });
      
      expect(result.cutType).toBe('fallback');
      expect(result.truncated.length).toBeLessThanOrEqual(5);
    });

    it('handles different units in fallback mode', async () => {
      const text = 'Word1 Word2 Word3 Word4 Word5';
      const result = await truncate(text, 'find best cut', { 
        limit: 2, 
        unit: 'words',
        llm: { modelName: 'invalid' } // Force failure
      });
      
      expect(result.cutType).toBe('fallback');
      const words = result.truncated.trim().split(/\s+/).filter(Boolean);
      expect(words.length).toBeLessThanOrEqual(2);
    });
  });

  describe('async behavior', () => {
    it('returns a promise', () => {
      const result = truncate('test', 'find best cut', { limit: 10 });
      expect(result).toBeInstanceOf(Promise);
    });

    it('can be awaited', async () => {
      const result = await truncate('test text', 'find best cut', { limit: 5 });
      expect(result).toHaveProperty('truncated');
    });
  });
});