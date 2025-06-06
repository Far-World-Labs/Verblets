import { describe, expect, it, vi } from 'vitest';
import listReduce from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn((prompt) => {
    // Extract accumulator from <accumulator> tags
    const accTagMatch = prompt.match(/<accumulator>([\s\S]*?)<\/accumulator>/);
    let acc = accTagMatch ? accTagMatch[1].trim() : '';
    
    // Extract list items from <list> tags
    const listMatch = prompt.match(/<list>\n([\s\S]*?)\n<\/list>/);
    const lines = listMatch ? listMatch[1].split('\n').filter(Boolean) : [];
    
    // Return the combined result as ChatGPT would
    return [acc, ...lines].filter(Boolean).join('+');
  }),
}));

describe('list-reduce verblet', () => {
  it('reduces items using instructions', async () => {
    const result = await listReduce('0', ['a', 'b', 'c'], 'join');
    expect(result).toBe('0+a+b+c');
  });
});
