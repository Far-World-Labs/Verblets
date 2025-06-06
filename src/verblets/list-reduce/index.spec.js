import { describe, expect, it, vi } from 'vitest';
import listReduce from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn((prompt) => {
    const listMatch = prompt.match(/<list>\n([\s\S]*?)\n<\/list>/);
    const accMatch = prompt.match(/<accumulator>\n([\s\S]*?)\n<\/accumulator>/);
    let acc = '';
    let lines = [];

    if (listMatch && accMatch) {
      acc = accMatch[1].trim();
      lines = listMatch[1]
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      return `${acc}+${lines.join('+')}`;
    }
    // Return the joined result as expected
    return [acc, ...lines].join('+');
  }),
}));

describe('list-reduce verblet', () => {
  it('reduces items using instructions', async () => {
    const result = await listReduce('0', ['a', 'b', 'c'], 'join');
    expect(result).toBe('a+b+c');
  });
});
