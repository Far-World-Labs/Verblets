import { describe, expect, it, vi } from 'vitest';
import listGroupBy from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async (prompt) => {
    const match = prompt.match(/<list>\n([\s\S]*?)\n<\/list>/);
    const lines = match ? match[1].split('\n') : [];
    const groups = {};
    lines.forEach((line) => {
      const key = line[0];
      groups[key] = groups[key] || [];
      groups[key].push(line);
    });
    return JSON.stringify(groups);
  }),
}));

describe('list-group-by verblet', () => {
  it('groups items using instructions', async () => {
    const result = await listGroupBy(['alpha', 'aardvark', 'beta'], 'group');
    expect(result).toStrictEqual({ a: ['alpha', 'aardvark'], b: ['beta'] });
  });
});
