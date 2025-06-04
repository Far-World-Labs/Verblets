import { describe, expect, it, vi } from 'vitest';
import listPartition from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async (prompt) => {
    const match = prompt.match(/<list>\n([\s\S]*?)\n<\/list>/);
    const lines = match ? match[1].split('\n') : [];
    return lines.map((l) => (l.length % 2 ? 'odd' : 'even')).join('\n');
  }),
}));

describe('list-partition verblet', () => {
  it('partitions items using instructions', async () => {
    const result = await listPartition(['a', 'bb', 'ccc'], 'odd or even length', ['odd', 'even']);
    expect(result).toStrictEqual({ odd: ['a', 'ccc'], even: ['bb'] });
  });
});
