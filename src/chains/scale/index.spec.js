import { describe, it, expect, vi, beforeEach } from 'vitest';
import scale, { createScale, scaleSpec, applyScale } from './index.js';
import chatGPT from '../../lib/chatgpt/index.js';

vi.mock('../../lib/chatgpt/index.js');

describe('scale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a scaling function that maps numeric values', async () => {
    // First mock for scaleSpec, then mock for applyScale
    vi.mocked(chatGPT)
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

    const scaleFunc = scale(prompt);
    const result = await scaleFunc({ stars: 3 });

    expect(result).toBe(50);
    // First call is for generating specification
    expect(chatGPT).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('<scaling-instructions>'),
      expect.objectContaining({
        system: expect.stringContaining('scale specification generator'),
        modelOptions: expect.objectContaining({
          response_format: {
            type: 'json_schema',
            json_schema: expect.any(Object),
          },
        }),
      })
    );

    // Second call is for applying the scale
    expect(chatGPT).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('<scale-specification>'),
      expect.objectContaining({
        modelOptions: expect.objectContaining({
          response_format: {
            type: 'json_schema',
            json_schema: expect.any(Object),
          },
        }),
      })
    );
  });

  it('should handle text input', async () => {
    vi.mocked(chatGPT)
      .mockResolvedValueOnce({
        domain: 'sentiment words',
        range: '0-100',
        mapping: 'sentiment mapping',
      })
      .mockResolvedValueOnce(75);

    const prompt = 'Map sentiment words to a 0-100 scale where 0 is negative and 100 is positive';
    const scaleFunc = scale(prompt);
    const result = await scaleFunc('excellent');

    expect(result).toBe(75);
  });

  it('should handle complex object outputs', async () => {
    vi.mocked(chatGPT)
      .mockResolvedValueOnce({
        domain: 'task descriptions',
        range: 'confidence and category',
        mapping: 'categorization',
      })
      .mockResolvedValueOnce({ confidence: 0.8, category: 'high' });

    const prompt = 'Categorize inputs and provide confidence scores';
    const scaleFunc = scale(prompt);
    const result = await scaleFunc('very important task');

    expect(result).toEqual({ confidence: 0.8, category: 'high' });
  });

  it('should pass through config options', async () => {
    vi.mocked(chatGPT)
      .mockResolvedValueOnce({ domain: 'numbers', range: '0-100', mapping: 'scale' })
      .mockResolvedValueOnce(42);

    const prompt = 'Scale numbers to 0-100';
    const scaleFunc = scale(prompt, { temperature: 0.2, model: 'gpt-4' });
    await scaleFunc(5);

    // Check the second call (applyScale) has the config options
    expect(chatGPT).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        temperature: 0.2,
        model: 'gpt-4',
      })
    );
  });

  it('should convert object inputs to JSON strings', async () => {
    vi.mocked(chatGPT)
      .mockResolvedValueOnce({
        domain: 'complex objects',
        range: 'scaled values',
        mapping: 'object scaling',
      })
      .mockResolvedValueOnce(30);

    const prompt = 'Scale complex objects';
    const scaleFunc = scale(prompt);
    await scaleFunc({ nested: { value: 123 }, array: [1, 2, 3] });

    expect(chatGPT).toHaveBeenCalledWith(expect.stringContaining('<item>'), expect.any(Object));
  });

  it('should expose prompt property', () => {
    const prompt = 'Test scale';
    const scaleFunc = scale(prompt);
    expect(scaleFunc.prompt).toBe(prompt);
  });
});

describe('createScale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use a pre-generated specification consistently', async () => {
    vi.mocked(chatGPT).mockResolvedValueOnce(50).mockResolvedValueOnce(100);

    const specification = {
      domain: '1-5',
      range: '0-100',
      mapping: 'Linear mapping',
    };
    const scaleFunc = createScale(specification);

    // Specification should be available immediately
    expect(scaleFunc.specification).toEqual(specification);

    // Apply scale to different values
    const result1 = await scaleFunc(3);
    expect(result1).toBe(50);

    const result2 = await scaleFunc(5);
    expect(result2).toBe(100);

    // Should have called chatGPT 2 times for applications only
    expect(chatGPT).toHaveBeenCalledTimes(2);
  });

  it('should expose specification property', () => {
    const specification = {
      domain: 'test domain',
      range: 'test range',
      mapping: 'test mapping',
    };
    const scaleFunc = createScale(specification);

    expect(scaleFunc.specification).toBe(specification);
  });
});

describe('scaleSpec', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate a scale specification', async () => {
    vi.mocked(chatGPT).mockResolvedValue({
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
    expect(chatGPT).toHaveBeenCalledWith(
      expect.stringContaining('Analyze these scaling instructions'),
      expect.objectContaining({
        system: expect.stringContaining('scale specification generator'),
        modelOptions: expect.objectContaining({
          response_format: expect.objectContaining({
            type: 'json_schema',
          }),
        }),
      })
    );
  });
});

describe('applyScale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should apply a scale using a specification', async () => {
    vi.mocked(chatGPT).mockResolvedValue(75);

    const specification = {
      domain: '1-5',
      range: '0-100',
      mapping: 'Linear transformation',
    };
    const result = await applyScale(4, specification);

    expect(result).toBe(75);
    expect(chatGPT).toHaveBeenCalledWith(
      expect.stringContaining('<scale-specification>'),
      expect.any(Object)
    );
  });

  it('should handle object inputs', async () => {
    vi.mocked(chatGPT).mockResolvedValue('high');

    const specification = {
      domain: 'scores between 0 and 1',
      range: 'labels: low, medium, high',
      mapping: 'Convert numeric scores to categorical labels',
    };
    const result = await applyScale({ score: 0.8 }, specification);

    expect(result).toBe('high');
  });
});
