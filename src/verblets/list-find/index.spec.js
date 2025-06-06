import { describe, expect, it, vi } from 'vitest';
import listFind from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async (prompt) => {
    const match = prompt.match(/<list>\n([\s\S]*?)\n<\/list>/);
    const lines = match ? match[1].split('\n') : [];
    const found = lines.find((l) => l.startsWith('b'));
    return found || '';
  }),
}));

describe('list-find verblet', () => {
  it('finds first matching item', async () => {
    const result = await listFind(['alpha', 'beta', 'carrot'], 'starts with b');
    expect(result).toBe('beta');
  });

  it('returns undefined when no match', async () => {
    const result = await listFind(['alpha', 'carrot'], 'starts with b');
    expect(result).toBeUndefined();
  });
});
