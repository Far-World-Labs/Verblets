import { describe, expect, it, vi } from 'vitest';
import listReduce from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn((prompt) => {
    // Extract accumulator from <accumulator> tags (with newlines)
    const accMatch = prompt.match(/<accumulator>\n([\s\S]*?)\n<\/accumulator>/);
    let acc = '';
    if (accMatch) {
      acc = accMatch[1].trim();
    }

    // Extract list items from <list> tags (with newlines)
    const listMatch = prompt.match(/<list>\n([\s\S]*?)\n<\/list>/);
    const lines = listMatch ? listMatch[1].split('\n').filter(Boolean) : [];

    // Return the joined result as expected
    return [acc, ...lines].join('+');
  }),
}));

describe('list-reduce verblet', () => {
  it('reduces items using instructions', async () => {
    const result = await listReduce('0', ['a', 'b', 'c'], 'join');
    expect(result).toBe('0+a+b+c');
  });
});
