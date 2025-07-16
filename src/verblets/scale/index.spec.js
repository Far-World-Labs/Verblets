import { describe, it, expect, vi, beforeEach } from 'vitest';
import scale, { createScale, scaleSpec, applyScale } from './index.js';
import chatGPT from '../../lib/chatgpt/index.js';

vi.mock('../../lib/chatgpt/index.js');

describe('scale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a scaling function that maps numeric values', async () => {
    vi.mocked(chatGPT).mockResolvedValue({ value: 50 });

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
    expect(chatGPT).toHaveBeenCalledWith(
      expect.stringContaining('<scaling_instructions>'),
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
    vi.mocked(chatGPT).mockResolvedValue({ value: 75 });

    const prompt = 'Map sentiment words to a 0-100 scale where 0 is negative and 100 is positive';
    const scaleFunc = scale(prompt);
    const result = await scaleFunc('excellent');

    expect(result).toBe(75);
  });

  it('should handle complex object outputs', async () => {
    vi.mocked(chatGPT).mockResolvedValue({ value: { confidence: 0.8, category: 'high' } });

    const prompt = 'Categorize inputs and provide confidence scores';
    const scaleFunc = scale(prompt);
    const result = await scaleFunc('very important task');

    expect(result).toEqual({ confidence: 0.8, category: 'high' });
  });

  it('should pass through config options', async () => {
    vi.mocked(chatGPT).mockResolvedValue({ value: 42 });

    const prompt = 'Scale numbers to 0-100';
    const scaleFunc = scale(prompt, { temperature: 0.2, model: 'gpt-4' });
    await scaleFunc(5);

    expect(chatGPT).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        modelOptions: expect.objectContaining({
          temperature: 0.2,
          model: 'gpt-4',
        }),
      })
    );
  });

  it('should convert object inputs to JSON strings', async () => {
    vi.mocked(chatGPT).mockResolvedValue({ value: 30 });

    const prompt = 'Scale complex objects';
    const scaleFunc = scale(prompt);
    await scaleFunc({ nested: { value: 123 }, array: [1, 2, 3] });

    expect(chatGPT).toHaveBeenCalledWith(
      expect.stringContaining('{"nested":{"value":123},"array":[1,2,3]}'),
      expect.any(Object)
    );
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

  it('should generate specification on first call and reuse it', async () => {
    vi.mocked(chatGPT)
      .mockResolvedValueOnce({ domain: '1-5', range: '0-100', mapping: 'Linear mapping' })
      .mockResolvedValueOnce({ value: 50 })
      .mockResolvedValueOnce({ value: 100 });

    const scaleFunc = createScale('Map 1-5 to 0-100');

    // First call generates spec
    expect(scaleFunc.specification).toBeNull();
    await scaleFunc(3);
    expect(scaleFunc.specification).toEqual({
      domain: '1-5',
      range: '0-100',
      mapping: 'Linear mapping',
    });

    // Second call reuses spec
    await scaleFunc(5);

    // Should have called chatGPT 3 times: spec generation + 2 applications
    expect(chatGPT).toHaveBeenCalledTimes(3);
  });

  it('should expose prompt and specification properties', async () => {
    vi.mocked(chatGPT)
      .mockResolvedValueOnce({
        domain: 'test domain',
        range: 'test range',
        mapping: 'test mapping',
      })
      .mockResolvedValueOnce({ value: 42 });

    const prompt = 'Test scale';
    const scaleFunc = createScale(prompt);

    expect(scaleFunc.prompt).toBe(prompt);
    expect(scaleFunc.specification).toBeNull();

    await scaleFunc(1);
    expect(scaleFunc.specification).toEqual({
      domain: 'test domain',
      range: 'test range',
      mapping: 'test mapping',
    });
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
    vi.mocked(chatGPT).mockResolvedValue({ value: 75 });

    const result = await applyScale(4, 'Domain: 1-5, Range: 0-100');

    expect(result).toBe(75);
    expect(chatGPT).toHaveBeenCalledWith(
      expect.stringContaining('Domain: 1-5, Range: 0-100'),
      expect.any(Object)
    );
  });

  it('should handle object inputs', async () => {
    vi.mocked(chatGPT).mockResolvedValue({ value: 'high' });

    const result = await applyScale({ score: 0.8 }, 'Convert scores to labels');

    expect(result).toBe('high');
  });
});
