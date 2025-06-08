import { describe, it, expect, vi } from 'vitest';
import sentiment from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async (prompt) => {
    if (/fantastic/.test(prompt)) return 'positive';
    if (/worst/.test(prompt)) return 'negative';
    return 'neutral';
  }),
}));

describe('sentiment verblt', () => {
  it('classifies positive text', async () => {
    expect(await sentiment('fantastic news')).toBe('positive');
  });

  it('classifies negative text', async () => {
    expect(await sentiment('worst day')).toBe('negative');
  });
});
