import { describe, it, expect, vi } from 'vitest';
import sentiment from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async (prompt) => {
    if (/fantastic|amazing|wonderful/.test(prompt)) return 'positive';
    if (/worst|terrible|awful/.test(prompt)) return 'negative';
    if (/okay|fine|average/.test(prompt)) return 'neutral';
    return 'neutral';
  }),
}));

describe('sentiment', () => {
  describe('with valid input', () => {
    it('should classify enthusiastic text as positive', async () => {
      const result = await sentiment('This is fantastic news!');
      expect(result).toBe('positive');
    });

    it('should classify negative expressions as negative', async () => {
      const result = await sentiment('This is the worst day ever');
      expect(result).toBe('negative');
    });

    it('should classify neutral statements as neutral', async () => {
      const result = await sentiment('The weather is okay today');
      expect(result).toBe('neutral');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string input', async () => {
      const result = await sentiment('');
      expect(result).toBe('neutral');
    });

    it('should handle single word input', async () => {
      const result = await sentiment('amazing');
      expect(result).toBe('positive');
    });

    it('should handle mixed sentiment text', async () => {
      const result = await sentiment('The food was amazing but the service was terrible');
      expect(typeof result).toBe('string');
    });
  });
});
