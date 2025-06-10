import { describe, expect, it, vi } from 'vitest';
import listFind from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async (prompt) => {
    const listMatch = prompt.match(/<list>\n([\s\S]*?)\n<\/list>/);
    const lines = listMatch ? listMatch[1].split('\n') : [];
    const parts = prompt.split('"');
    const letter = [...parts].reverse().find((p) => /^[a-z]+$/i.test(p.trim())) || '';
    return lines.find((l) => l.includes(letter)) || '';
  }),
}));

describe('list-find verblet', () => {
  it('finds item using instructions', async () => {
    const result = await listFind(['alpha', 'beta', 'gamma'], 'find "b"');
    expect(result).toBe('beta');
  });
});
