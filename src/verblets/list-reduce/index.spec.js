import { describe, expect, it, vi } from 'vitest';
import listReduce from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async (prompt) => {
    const listMatch = prompt.match(/<list>\n([\s\S]*?)\n<\/list>/);
    const lines = listMatch ? listMatch[1].split('\n') : [];
    const accMatch =
      prompt.match(/<accumulator>([\s\S]*?)<\/accumulator>/) ||
      [...prompt.matchAll(/"([^"]*)"/g)][1];
    const acc = accMatch ? accMatch[1].trim() : '';
    return [acc, ...lines].filter(Boolean).join('+');
  }),
}));

describe('list-reduce verblet', () => {
  it('reduces items using instructions', async () => {
    const result = await listReduce('0', ['a', 'b', 'c'], 'join');
    expect(result).toBe('0+a+b+c');
  });
});
