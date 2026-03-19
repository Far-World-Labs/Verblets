import { describe, it, expect, vi, beforeEach } from 'vitest';
import commonalities, { mapDepth } from './index.js';

// Mock the llm function
vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
}));

const mockLlm = (await import('../../lib/llm/index.js')).default;

beforeEach(() => {
  mockLlm.mockReset();
});

describe('mapDepth', () => {
  it('returns undefined when undefined', () => {
    expect(mapDepth(undefined)).toBeUndefined();
  });

  it('maps low to surface-level guidance', () => {
    const guidance = mapDepth('low');
    expect(guidance).toContain('literal');
    expect(guidance).toContain('surface-level');
  });

  it('maps high to deep/abstract guidance', () => {
    const guidance = mapDepth('high');
    expect(guidance).toContain('structural patterns');
    expect(guidance).toContain('non-obvious');
  });

  it('returns undefined on unknown string', () => {
    expect(mapDepth('cosmic')).toBeUndefined();
  });
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

  it('injects low depth guidance into prompt', async () => {
    mockLlm.mockResolvedValueOnce({ items: ['Both are fruits'] });

    await commonalities(['apple', 'orange'], { depth: 'low' });

    const prompt = mockLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('literal');
    expect(prompt).toContain('surface-level');
  });

  it('injects high depth guidance into prompt', async () => {
    mockLlm.mockResolvedValueOnce({ items: ['Seed dispersal strategy'] });

    await commonalities(['apple', 'orange'], { depth: 'high' });

    const prompt = mockLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('structural patterns');
    expect(prompt).toContain('non-obvious');
  });

  it('omits depth guidance when not specified', async () => {
    mockLlm.mockResolvedValueOnce({ items: ['Fruits'] });

    await commonalities(['apple', 'orange']);

    const prompt = mockLlm.mock.calls.at(-1)[0];
    expect(prompt).not.toContain('literal');
    expect(prompt).not.toContain('structural patterns');
  });
});
