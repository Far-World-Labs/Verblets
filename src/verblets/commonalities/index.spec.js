import { describe, it, expect, vi, beforeEach } from 'vitest';
import commonalities from './index.js';
import { testPromptShapingOption } from '../../lib/test-utils/index.js';

// Mock the llm function
vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn(),
}));

const mockLlm = (await import('../../lib/llm/index.js')).default;

beforeEach(() => {
  mockLlm.mockReset();
});

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
    mockLlm.mockResolvedValueOnce(undefined);

    const result = await commonalities(['item1', 'item2']);
    expect(result).toEqual([]);
  });

  it('accepts instructions as positional argument', async () => {
    mockLlm.mockResolvedValueOnce({ items: ['Urban transport'] });

    const result = await commonalities(
      ['bus', 'subway', 'taxi'],
      'focus on public transportation in cities'
    );

    expect(result).toEqual(['Urban transport']);
    expect(mockLlm.mock.calls[0][0]).toContain('focus on public transportation in cities');
  });

  it('wires instruction bundle context into prompt', async () => {
    mockLlm.mockResolvedValueOnce({ items: ['Urban rail'] });

    await commonalities(['bus', 'subway'], {
      text: 'focus on transit',
      region: 'Southeast Asia',
    });

    const prompt = mockLlm.mock.calls[0][0];
    expect(prompt).toContain('focus on transit');
    expect(prompt).toContain('<region>');
    expect(prompt).toContain('Southeast Asia');
  });

  testPromptShapingOption('depth', {
    invoke: (config) => commonalities(['apple', 'orange'], config),
    setupMocks: () => mockLlm.mockResolvedValueOnce({ items: ['Fruits'] }),
    llmMock: mockLlm,
    markers: { low: 'literal', high: 'structural patterns' },
  });
});
