import { describe, it, expect, vi } from 'vitest';
import intersection from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async (prompt) => {
    console.log('Mock received prompt:', prompt);
    // Look for quoted items in the prompt
    const match = prompt.match(/"([^"]+)"/);
    if (match) {
      const itemsLine = match[1];
      const items = itemsLine.split(' | ');
      const commonalities = items.map((item) => `common: ${item}`);
      // Add combinations
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          commonalities.push(`common: ${items[i]} | ${items[j]}`);
        }
      }
      // Add all items combination
      if (items.length > 2) {
        commonalities.push(`common: ${items.join(' | ')}`);
      }
      console.log('Mock returning:', JSON.stringify(commonalities));
      return JSON.stringify(commonalities);
    }
    console.log('Mock: no match found, returning empty array');
    return JSON.stringify([]);
  }),
}));

describe('intersection verblet', () => {
  it('describes commonalities between sets', async () => {
    const result = await intersection(['a', 'b', 'c']);
    expect(result).toStrictEqual([
      'common: a',
      'common: b',
      'common: c',
      'common: a | b',
      'common: a | c',
      'common: b | c',
      'common: a | b | c',
    ]);
  });

  it('includes custom instructions in the prompt', async () => {
    const chatGPT = (await import('../../lib/chatgpt/index.js')).default;
    await intersection(['x', 'y', 'z'], { instructions: 'focus on features' });
    expect(chatGPT).toHaveBeenCalledWith(
      expect.stringContaining('focus on features'),
      expect.any(Object)
    );
  });

  it('returns empty array when model returns empty response', async () => {
    const chatGPT = (await import('../../lib/chatgpt/index.js')).default;
    chatGPT.mockResolvedValueOnce('[]');
    const result = await intersection(['x', 'y']);
    expect(result).toStrictEqual([]);
  });
});
