import { describe, it, expect, vi, beforeEach } from 'vitest';
import scale from './index.js';
import chatGPT from '../../lib/chatgpt/index.js';

vi.mock('../../lib/chatgpt/index.js');

describe('scale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a scaling function that maps numeric values', async () => {
    vi.mocked(chatGPT).mockResolvedValue('{"value": 50}');

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
        response_format: {
          type: 'json_schema',
          json_schema: expect.any(Object),
        },
      })
    );
  });

  it('should handle text input', async () => {
    vi.mocked(chatGPT).mockResolvedValue('{"value": 75}');

    const prompt = 'Map sentiment words to a 0-100 scale where 0 is negative and 100 is positive';
    const scaleFunc = scale(prompt);
    const result = await scaleFunc('excellent');

    expect(result).toBe(75);
  });

  it('should handle complex object outputs', async () => {
    vi.mocked(chatGPT).mockResolvedValue('{"value": {"confidence": 0.8, "category": "high"}}');

    const prompt = 'Categorize inputs and provide confidence scores';
    const scaleFunc = scale(prompt);
    const result = await scaleFunc('very important task');

    expect(result).toEqual({ confidence: 0.8, category: 'high' });
  });

  it('should pass through config options', async () => {
    vi.mocked(chatGPT).mockResolvedValue('{"value": 42}');

    const prompt = 'Scale numbers to 0-100';
    const scaleFunc = scale(prompt, { temperature: 0.2, model: 'gpt-4' });
    await scaleFunc(5);

    expect(chatGPT).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        temperature: 0.2,
        model: 'gpt-4',
      })
    );
  });

  it('should convert object inputs to JSON strings', async () => {
    vi.mocked(chatGPT).mockResolvedValue('{"value": 30}');

    const prompt = 'Scale complex objects';
    const scaleFunc = scale(prompt);
    await scaleFunc({ nested: { value: 123 }, array: [1, 2, 3] });

    expect(chatGPT).toHaveBeenCalledWith(
      expect.stringContaining('{"nested":{"value":123},"array":[1,2,3]}'),
      expect.any(Object)
    );
  });
});
