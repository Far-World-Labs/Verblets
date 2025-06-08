import { describe, expect, it, vi } from 'vitest';
import listFilter from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async (prompt) => {
    const listMatch = prompt.match(/<list>\n([\s\S]*?)\n<\/list>/);
    const lines = listMatch ? listMatch[1].split('\n') : [];
    const instMatch = prompt.match(/"([^"]+)"/);
    const letter = instMatch ? instMatch[1] : '';
    return lines.filter((l) => l.includes(letter)).join('\n');
  }),
}));

describe('list-filter verblet', () => {
  it('filters items using instructions', async () => {
    const result = await listFilter(['alpha', 'beta', 'gamma'], 'm');
    expect(result).toStrictEqual(['gamma']);
  });
});
