import { describe, it, expect, vi } from 'vitest';
import commonalities from './index.js';

// Mock the chatGPT function
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(),
}));

const mockChatGPT = (await import('../../lib/chatgpt/index.js')).default;

describe('commonalities', () => {
  it('returns empty array for empty input', async () => {
    const result = await commonalities([]);
    expect(result).toEqual([]);
  });

  it('returns empty array for single item', async () => {
    const result = await commonalities(['item1']);
    expect(result).toEqual([]);
  });

  it('finds common threads between items', async () => {
    mockChatGPT.mockResolvedValueOnce({
      items: ['Portable electronics', 'Computing devices'],
    });

    const result = await commonalities(['smartphone', 'laptop', 'tablet']);
    expect(result).toEqual(['Portable electronics', 'Computing devices']);
  });

  it('handles string response from LLM', async () => {
    mockChatGPT.mockResolvedValueOnce('{"items": ["Transportation", "Wheeled vehicles"]}');

    const result = await commonalities(['car', 'bicycle', 'motorcycle']);
    expect(result).toEqual(['Transportation', 'Wheeled vehicles']);
  });

  it('returns empty array when no commonalities found', async () => {
    mockChatGPT.mockResolvedValueOnce({ items: [] });

    const result = await commonalities(['apple', 'car']);
    expect(result).toEqual([]);
  });

  it('handles malformed JSON gracefully', async () => {
    mockChatGPT.mockResolvedValueOnce('invalid json');

    const result = await commonalities(['item1', 'item2']);
    expect(result).toEqual([]);
  });

  it('accepts custom instructions', async () => {
    mockChatGPT.mockResolvedValueOnce({ items: ['Urban transport'] });

    const result = await commonalities(['bus', 'subway', 'taxi'], {
      instructions: 'focus on public transportation in cities',
    });

    expect(result).toEqual(['Urban transport']);
  });
});
