import { describe, it, expect, vi, beforeEach } from 'vitest';
import scaleItem, { scaleSpec, scaleInstructions, mapScale } from './index.js';
import llm from '../../lib/llm/index.js';
import map from '../map/index.js';

vi.mock('../../lib/llm/index.js', async (importOriginal) => ({
  ...(await importOriginal()),
  default: vi.fn(),
}));

vi.mock('../map/index.js', () => ({
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

  it('throws when LLM returns object output (schema declares number|string)', async () => {
    vi.mocked(llm)
      .mockResolvedValueOnce({
        domain: 'task descriptions',
        range: 'confidence and category',
        mapping: 'categorization',
      })
      .mockResolvedValueOnce({ confidence: 0.8, category: 'high' });

    await expect(
      scaleItem('very important task', 'Categorize inputs and provide confidence scores')
    ).rejects.toThrow(/expected number or string/);
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

describe('mapScale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSpec = { domain: 'd', range: 'r', mapping: 'm' };

  it('generates spec once and routes through the map chain', async () => {
    vi.mocked(llm).mockResolvedValueOnce(mockSpec);
    vi.mocked(map).mockResolvedValueOnce([10, 20, 30]);

    const result = await mapScale([1, 2, 3], 'scale 1-3 to 0-30');
    expect(result).toEqual([10, 20, 30]);
    expect(llm).toHaveBeenCalledTimes(1);
    expect(map).toHaveBeenCalledTimes(1);
    const mapInstructions = vi.mocked(map).mock.calls[0][1];
    expect(mapInstructions).toContain('<scale-specification>');
  });

  it('skips spec generation when spec is provided in the bundle', async () => {
    vi.mocked(map).mockResolvedValueOnce([5, 7]);
    const result = await mapScale([1, 2], { text: 'ignored', spec: mockSpec });
    expect(result).toEqual([5, 7]);
    expect(llm).not.toHaveBeenCalled();
  });

  it('reports partial outcome when some slots fail', async () => {
    vi.mocked(map).mockResolvedValueOnce([10, undefined, 30]);
    const events = [];
    await mapScale([1, 2, 3], { text: 'x', spec: mockSpec }, { onProgress: (e) => events.push(e) });
    const complete = events.find((e) => e.event === 'chain:complete');
    expect(complete.outcome).toBe('partial');
    expect(complete.failedItems).toBe(1);
  });

  it('serializes object items into strings before dispatching', async () => {
    vi.mocked(map).mockResolvedValueOnce([1, 2]);
    await mapScale([{ a: 1 }, 'plain'], { text: 'x', spec: mockSpec });
    const list = vi.mocked(map).mock.calls[0][0];
    expect(list[0]).toBe('{"a":1}');
    expect(list[1]).toBe('plain');
  });
});
