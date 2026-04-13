import { describe, it, expect, vi, beforeEach } from 'vitest';
import scaleItem, { scaleSpec, scaleInstructions } from './index.js';
import llm from '../../lib/llm/index.js';

vi.mock('../../lib/llm/index.js', async (importOriginal) => ({
  ...(await importOriginal()),
  default: vi.fn(),
}));

describe('scaleItem (default export)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should scale a numeric value with spec generation', async () => {
    vi.mocked(llm)
      .mockResolvedValueOnce({ domain: 'stars 1-5', range: '0-100 quality', mapping: 'linear' })
      .mockResolvedValueOnce(50);

    const prompt = `
Sample data:
{ stars: 1 }
{ stars: 5 }

Range:
name: quality
description: 0 means terrible, 100 means amazing
bounds: [0, 100]

Mapping: Map the "stars" field linearly to the quality range.`;

    const result = await scaleItem({ stars: 3 }, prompt);

    expect(result).toBe(50);
    expect(llm).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('<scaling-instructions>'),
      expect.objectContaining({
        systemPrompt: expect.stringContaining('scale specification generator'),
      })
    );
    expect(llm).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('<scale-specification>'),
      expect.any(Object)
    );
  });

  it('should handle text input', async () => {
    vi.mocked(llm)
      .mockResolvedValueOnce({
        domain: 'sentiment words',
        range: '0-100',
        mapping: 'sentiment mapping',
      })
      .mockResolvedValueOnce(75);

    const result = await scaleItem(
      'excellent',
      'Map sentiment words to a 0-100 scale where 0 is negative and 100 is positive'
    );

    expect(result).toBe(75);
  });

  it('should handle complex object outputs', async () => {
    vi.mocked(llm)
      .mockResolvedValueOnce({
        domain: 'task descriptions',
        range: 'confidence and category',
        mapping: 'categorization',
      })
      .mockResolvedValueOnce({ confidence: 0.8, category: 'high' });

    const result = await scaleItem(
      'very important task',
      'Categorize inputs and provide confidence scores'
    );

    expect(result).toEqual({ confidence: 0.8, category: 'high' });
  });

  it('should convert object inputs to JSON strings', async () => {
    vi.mocked(llm)
      .mockResolvedValueOnce({
        domain: 'complex objects',
        range: 'scaled values',
        mapping: 'object scaling',
      })
      .mockResolvedValueOnce(30);

    await scaleItem({ nested: { value: 123 }, array: [1, 2, 3] }, 'Scale complex objects');

    expect(llm).toHaveBeenCalledWith(expect.stringContaining('<item>'), expect.any(Object));
  });
});

describe('scaleSpec', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate a scale specification', async () => {
    vi.mocked(llm).mockResolvedValue({
      domain: 'Complete domain',
      range: 'Complete range',
      mapping: 'Complete mapping',
    });

    const spec = await scaleSpec('Convert temperatures');

    expect(spec).toEqual({
      domain: 'Complete domain',
      range: 'Complete range',
      mapping: 'Complete mapping',
    });
    expect(llm).toHaveBeenCalledWith(
      expect.stringContaining('Analyze these scaling instructions'),
      expect.objectContaining({
        systemPrompt: expect.stringContaining('scale specification generator'),
      })
    );
  });
});

describe('scaleItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should scale a single item with spec generation', async () => {
    vi.mocked(llm)
      .mockResolvedValueOnce({
        domain: '1-5',
        range: '0-100',
        mapping: 'Linear transformation',
      })
      .mockResolvedValueOnce(75);

    const result = await scaleItem(4, 'Map 1-5 to 0-100');

    expect(result).toBe(75);
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it('should skip spec generation when spec provided via instruction bundle', async () => {
    vi.mocked(llm).mockResolvedValueOnce(75);

    const spec = {
      domain: '1-5',
      range: '0-100',
      mapping: 'Linear transformation',
    };
    const result = await scaleItem(4, { text: 'Scale this', spec });

    expect(result).toBe(75);
    // Only one LLM call — spec generation skipped
    expect(llm).toHaveBeenCalledTimes(1);
    expect(llm).toHaveBeenCalledWith(
      expect.stringContaining('<scale-specification>'),
      expect.any(Object)
    );
  });
});

describe('scaleInstructions', () => {
  it('returns instruction bundle with spec', () => {
    const spec = { domain: 'test', range: 'test', mapping: 'test' };
    const bundle = scaleInstructions({ spec });

    expect(bundle.text).toContain('scale specification');
    expect(bundle.spec).toBe(spec);
  });

  it('passes through additional context keys', () => {
    const bundle = scaleInstructions({ spec: 'spec', domain: 'temperature' });

    expect(bundle.domain).toBe('temperature');
  });
});
