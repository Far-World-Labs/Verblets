import { describe, it, expect, vi, beforeEach } from 'vitest';
import commonalities, { mapDepth } from './index.js';
import { testStringMapper, testPromptShapingOption } from '../../lib/test-utils/index.js';

// Mock the llm function
vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
}));

const mockLlm = (await import('../../lib/llm/index.js')).default;

beforeEach(() => {
  mockLlm.mockReset();
});

testStringMapper('mapDepth', mapDepth);

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
    mockLlm.mockResolvedValueOnce({
      items: ['Portable electronics', 'Computing devices'],
    });

    const result = await commonalities(['smartphone', 'laptop', 'tablet']);
    expect(result).toEqual(['Portable electronics', 'Computing devices']);
  });

  it('handles parsed response from LLM', async () => {
    mockLlm.mockResolvedValueOnce({ items: ['Transportation', 'Wheeled vehicles'] });

    const result = await commonalities(['car', 'bicycle', 'motorcycle']);
    expect(result).toEqual(['Transportation', 'Wheeled vehicles']);
  });

  it('returns empty array when no commonalities found', async () => {
    mockLlm.mockResolvedValueOnce({ items: [] });

    const result = await commonalities(['apple', 'car']);
    expect(result).toEqual([]);
  });

  it('handles unexpected response gracefully', async () => {
    mockLlm.mockResolvedValueOnce(null);

    const result = await commonalities(['item1', 'item2']);
    expect(result).toEqual([]);
  });

  it('accepts custom instructions', async () => {
    mockLlm.mockResolvedValueOnce({ items: ['Urban transport'] });

    const result = await commonalities(['bus', 'subway', 'taxi'], {
      instructions: 'focus on public transportation in cities',
    });

    expect(result).toEqual(['Urban transport']);
  });

  testPromptShapingOption('depth', {
    invoke: (config) => commonalities(['apple', 'orange'], config),
    setupMocks: () => mockLlm.mockResolvedValueOnce({ items: ['Fruits'] }),
    llmMock: mockLlm,
    markers: { low: 'literal', high: 'structural patterns' },
  });
});
