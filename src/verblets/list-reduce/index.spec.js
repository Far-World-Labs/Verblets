import { describe, expect, it, vi } from 'vitest';
import listReduce from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async (prompt) => {
    const listMatch = prompt.match(/<list>\n([\s\S]*?)\n<\/list>/);
    const lines = listMatch ? listMatch[1].split('\n') : [];
    let acc = '';
    const accMatch = prompt.match(/<accumulator>([\s\S]*?)<\/accumulator>/);
    if (accMatch) {
      acc = accMatch[1].trim();
    } else {
      const quotes = prompt.match(/"([^"]*)"/g) || [];
      if (quotes[1]) {
        acc = quotes[1].replace(/"/g, '').trim();
      }
    }
    return [acc, ...lines].filter(Boolean).join('+');
  }),
}));

describe('list-reduce verblet', () => {
  it('reduces items using instructions', async () => {
    const result = await listReduce('0', ['a', 'b', 'c'], 'join');
    expect(result).toBe('0+a+b+c');
  });
});
