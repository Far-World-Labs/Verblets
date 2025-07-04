import { describe, expect, it, vi } from 'vitest';
import listReduce from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn((prompt) => {
    const listMatch = prompt.match(/<list>\n([\s\S]*?)\n<\/list>/);
    const accMatch = prompt.match(/<accumulator>\n([\s\S]*?)\n<\/accumulator>/);
    let lines = [];

    if (listMatch && accMatch) {
      lines = listMatch[1]
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      return lines.join('+');
    }
    // Return just the joined list items
    return lines.join('+');
  }),
}));

describe('list-reduce verblet', () => {
  it('reduces items using instructions', async () => {
    const result = await listReduce('0', ['a', 'b', 'c'], 'join');
    expect(result).toBe('a+b+c');
  });
});
