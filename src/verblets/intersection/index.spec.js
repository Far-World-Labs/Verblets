import { describe, it, expect, vi } from 'vitest';
import intersection from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async (prompt) => {
    const match = prompt.match(/<sets>\n([\s\S]*?)\n<\/sets>/);
    const lines = match ? match[1].split('\n') : [];
    return lines.map((line) => `common: ${line}`).join('\n');
  }),
}));

describe('intersection verblet', () => {
  it('describes commonalities between sets', async () => {
    const result = await intersection(['a', 'b', 'c']);
    expect(result).toStrictEqual([
      'common: a | b',
      'common: a | c',
      'common: b | c',
      'common: a | b | c',
    ]);
  });

  it('includes custom instructions in the prompt', async () => {
    const chatGPT = (await import('../../lib/chatgpt/index.js')).default;
    await intersection(['x', 'y', 'z'], { instructions: 'focus on features' });
    expect(chatGPT).toHaveBeenCalledWith(expect.stringContaining('focus on features'));
  });

  it('returns empty array when model returns empty response', async () => {
    const chatGPT = (await import('../../lib/chatgpt/index.js')).default;
    chatGPT.mockResolvedValueOnce('');
    const result = await intersection(['x', 'y']);
    expect(result).toStrictEqual([]);
  });
});
