import { describe, expect, it, vi } from 'vitest';
import listReduce from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn((prompt) => {
    const listMatch = prompt.match(/<list>\n([\s\S]*?)\n<\/list>/);
    const accMatch = prompt.match(/"([^"]+)"\s*<list>/);

    if (listMatch && accMatch) {
      const acc = accMatch[1];
      const lines = listMatch[1]
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line);
      return `${acc}+${lines.join('+')}`;
    }

    return '';
  }),
}));

describe('list-reduce verblet', () => {
  it('reduces items using instructions', async () => {
    const result = await listReduce('0', ['a', 'b', 'c'], 'join');
    console.log('Test received result:', result);
    expect(result).toBe('0+a+b+c');
  });
});
