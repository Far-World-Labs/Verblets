import { describe, expect, it, vi } from 'vitest';
import truncate from './index.js';

describe('truncate', () => {
  describe('edge cases', () => {
    it('handles null input', async () => {
      const result = await truncate(null, 'truncate', { limit: 10 });
      expect(result).toEqual({
        truncated: '',
        cutPoint: 0,
        cutType: 'none',
        preservationScore: 0.0,
        reasoning: 'Empty or invalid input',
      });
    });

    it('handles undefined input', async () => {
      const result = await truncate(undefined, 'truncate', { limit: 10 });
      expect(result).toEqual({
        truncated: '',
        cutPoint: 0,
        cutType: 'none',
        preservationScore: 0.0,
        reasoning: 'Empty or invalid input',
      });
    });

    it('handles empty string', async () => {
      const result = await truncate('', 'truncate', { limit: 10 });
      expect(result).toEqual({
        truncated: '',
        cutPoint: 0,
        cutType: 'none',
        preservationScore: 0.0,
        reasoning: 'Empty or invalid input',
      });
    });

    it('handles non-string input', async () => {
      const result = await truncate(123, 'truncate', { limit: 10 });
      expect(result).toEqual({
        truncated: '',
        cutPoint: 0,
        cutType: 'none',
        preservationScore: 0.0,
        reasoning: 'Empty or invalid input',
      });
    });
  });

  describe('full text scenarios', () => {
    it('returns full text when under character limit', async () => {
      const text = 'Short text';
      const result = await truncate(text, 'truncate', { limit: 100, unit: 'characters' });
      
      expect(result.truncated).toBe(text);
      expect(result.cutType).toBe('full');
      expect(result.preservationScore).toBe(1.0);
      expect(result.cutPoint).toBe(text.length);
      expect(result.reasoning).toBe('Text already within limit');
    });

    it('returns full text when under word limit', async () => {
      const text = 'Short text here';
      const result = await truncate(text, 'truncate', { limit: 10, unit: 'words' });
      
      expect(result.truncated).toBe(text);
      expect(result.cutType).toBe('full');
      expect(result.preservationScore).toBe(1.0);
      expect(result.cutPoint).toBe(3);
      expect(result.reasoning).toBe('Text already within limit');
    });
  });

  describe('configuration validation', () => {
    it('uses default values when config is empty', async () => {
      const text = 'Test text that should be truncated';
      const result = await truncate(text, 'truncate');
      
      expect(result).toHaveProperty('truncated');
      expect(result).toHaveProperty('cutPoint');
      expect(result).toHaveProperty('cutType');
      expect(result).toHaveProperty('preservationScore');
      expect(result).toHaveProperty('reasoning');
    });

    it('respects custom limit', async () => {
      const text = 'This is a test text';
      const result = await truncate(text, 'truncate', { limit: 10, unit: 'characters' });
      
      expect(result.truncated.length).toBeLessThanOrEqual(10);
    });

    it('respects word unit', async () => {
      const text = 'One two three four five six seven eight nine ten';
      const result = await truncate(text, 'truncate', { limit: 5, unit: 'words' });
      
      const wordCount = result.truncated.trim().split(/\s+/).filter(Boolean).length;
      expect(wordCount).toBeLessThanOrEqual(5);
    });
  });

  describe('LLM integration', () => {
    it('returns valid structure even with LLM failure', async () => {
      // Mock console.warn to avoid noise in test output
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const text = 'This text will trigger fallback behavior';
      const result = await truncate(text, 'truncate', { 
        limit: 20,
        llm: { modelName: 'invalid-model-that-will-fail' }
      });
      
      expect(result).toHaveProperty('truncated');
      expect(result).toHaveProperty('cutPoint');
      expect(result).toHaveProperty('cutType');
      expect(result).toHaveProperty('preservationScore');
      expect(result).toHaveProperty('reasoning');
      
      expect(result.reasoning).toContain('fallback');
      expect(result.cutType).toBe('soft');
      
      consoleSpy.mockRestore();
    });

    it('passes through LLM configuration', async () => {
      const text = 'Test text for LLM configuration';
      const customConfig = {
        limit: 50,
        llm: { temperature: 0.5, modelName: 'gpt-3.5-turbo' },
        maxAttempts: 1
      };
      
      const result = await truncate(text, 'Truncate carefully', customConfig);
      
      expect(result).toHaveProperty('truncated');
      expect(typeof result.reasoning).toBe('string');
    });
  });

  describe('chunking behavior', () => {
    it('handles very long texts by chunking', async () => {
      // Create a text longer than default chunkLen (4000)
      const longText = 'This is a sentence. '.repeat(250); // ~5000 characters
      
      const result = await truncate(longText, 'Truncate at sentence boundary', { 
        limit: 100,
        chunkLen: 1000 // Smaller chunk for testing
      });
      
      expect(result.truncated.length).toBeLessThanOrEqual(100);
      expect(result).toHaveProperty('reasoning');
    });
  });

  describe('unit handling', () => {
    it('correctly calculates character length', async () => {
      const text = 'Hello';
      const result = await truncate(text, 'truncate', { limit: 10, unit: 'characters' });
      
      expect(result.cutPoint).toBe(5); // 'Hello' has 5 characters
    });

    it('correctly calculates word length', async () => {
      const text = 'Hello world test';
      const result = await truncate(text, 'truncate', { limit: 10, unit: 'words' });
      
      expect(result.cutPoint).toBe(3); // 3 words
    });

    it('treats tokens as words by default', async () => {
      const text = 'Hello world test example';
      const result = await truncate(text, 'truncate', { limit: 10, unit: 'tokens' });
      
      expect(result.cutPoint).toBe(4); // 4 tokens/words
    });
  });

  describe('preservation score validation', () => {
    it('always returns score between 0 and 1', async () => {
      const testCases = [
        { text: '', limit: 10 },
        { text: 'Short', limit: 100 },
        { text: 'This is a longer text that will be truncated', limit: 20 },
      ];
      
      for (const testCase of testCases) {
        const result = await truncate(testCase.text, 'truncate', { limit: testCase.limit });
        expect(result.preservationScore).toBeGreaterThanOrEqual(0);
        expect(result.preservationScore).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('async behavior', () => {
    it('returns a promise', () => {
      const result = truncate('test', 'truncate', { limit: 10 });
      expect(result).toBeInstanceOf(Promise);
    });

    it('can be awaited', async () => {
      const result = await truncate('test text', 'truncate', { limit: 5 });
      expect(result).toHaveProperty('truncated');
    });
  });
});