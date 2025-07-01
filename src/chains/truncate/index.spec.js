import { describe, expect, it } from 'vitest';
import truncate from './index.js';

describe('truncate', () => {
  describe('basic functionality', () => {
    it('returns correct structure for valid input', () => {
      const result = truncate('Hello world', { limit: 5 });

      expect(result).toHaveProperty('truncated');
      expect(result).toHaveProperty('cutPoint');
      expect(result).toHaveProperty('cutType');
      expect(result).toHaveProperty('preservationScore');
      expect(typeof result.preservationScore).toBe('number');
    });

    it('handles empty string input', () => {
      const result = truncate('', { limit: 10 });

      expect(result.truncated).toBe('');
      expect(result.cutPoint).toBe(0);
      expect(result.cutType).toBe('none');
      expect(result.preservationScore).toBe(0);
    });

    it('handles null/undefined input', () => {
      expect(truncate(null, { limit: 10 })).toEqual({
        truncated: '',
        cutPoint: 0,
        cutType: 'none',
        preservationScore: 0,
      });

      expect(truncate(undefined, { limit: 10 })).toEqual({
        truncated: '',
        cutPoint: 0,
        cutType: 'none',
        preservationScore: 0,
      });
    });
  });

  describe('unit types', () => {
    const text = 'The quick brown fox';

    it('handles character limits', () => {
      const result = truncate(text, { limit: 10, unit: 'characters' });
      expect(result.truncated.length).toBeLessThanOrEqual(10);
    });

    it('handles word limits', () => {
      const result = truncate(text, { limit: 2, unit: 'words' });
      expect(result.truncated.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(2);
    });

    it('handles token limits with custom tokenizer', () => {
      const tokenizer = (text) => text.split(' ');
      const result = truncate(text, { limit: 2, unit: 'tokens', tokenizer });
      expect(result.cutPoint).toBeLessThanOrEqual(2);
    });

    it('throws error for unknown unit', () => {
      expect(() => {
        truncate(text, { limit: 10, unit: 'unknown' });
      }).toThrow('Unknown unit: unknown');
    });
  });

  describe('boundary detection', () => {
    it('prefers paragraph boundaries', () => {
      const text = 'Para one.\n\nPara two.\n\nPara three.';
      const result = truncate(text, { limit: 12 });
      expect(result.cutType).toBe('paragraph');
      expect(result.truncated).toBe('Para one.');
    });

    it('falls back to sentence boundaries', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const result = truncate(text, { limit: 20 });
      expect(result.cutType).toBe('sentence');
      expect(result.truncated).toBe('First sentence.');
    });

    it('detects clause boundaries', () => {
      const text = 'This is complex, with commas, and semicolons; plus more content here.';
      const result = truncate(text, { limit: 30 });
      expect(result.cutType).toBe('clause');
    });

    it('falls back to word boundaries', () => {
      const text = 'Supercalifragilisticexpialidocious word here';
      const result = truncate(text, { limit: 15 });
      expect(['word', 'soft']).toContain(result.cutType);
    });
  });

  describe('preservation score', () => {
    it('returns 1.0 for full text preservation', () => {
      const result = truncate('Short', { limit: 100 });
      expect(result.preservationScore).toBe(1.0);
      expect(result.cutType).toBe('full');
    });

    it('calculates accurate preservation scores', () => {
      const text = 'Hello world test';
      const result = truncate(text, { limit: 5 });
      expect(result.preservationScore).toBeGreaterThan(0);
      expect(result.preservationScore).toBeLessThan(1);
    });

    it('rounds preservation score to 3 decimal places', () => {
      const result = truncate('Hello world', { limit: 5 });
      const decimals = result.preservationScore.toString().split('.')[1];
      expect(decimals?.length || 0).toBeLessThanOrEqual(3);
    });
  });

  describe('code block handling', () => {
    it('preserves complete code blocks when possible', () => {
      const text = 'Code:\n\n```js\nfunction test() {\n  return true;\n}\n```\n\nMore text.';
      const result = truncate(text, { limit: 50 });

      if (result.cutType === 'code-block') {
        expect(result.truncated).toContain('```js');
        expect(result.truncated).toContain('```');
      }
    });
  });

  describe('edge cases', () => {
    it('handles text with only whitespace', () => {
      const result = truncate('   \n\n  ', { limit: 5 });
      expect(result.truncated).toBeTruthy();
    });

    it('handles very long words', () => {
      const longWord = 'a'.repeat(100);
      const result = truncate(longWord, { limit: 10 });
      expect(result.truncated.length).toBeLessThanOrEqual(10);
      expect(result.cutType).toBe('soft');
    });

    it('handles mixed line endings', () => {
      const text = 'Line one\r\nLine two\nLine three';
      const result = truncate(text, { limit: 15 });
      expect(result.truncated).toBeTruthy();
    });
  });
});
