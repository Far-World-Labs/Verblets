import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../verblets/commonalities/index.js', () => ({ default: vi.fn() }));
vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));
vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => fn()),
}));

import intersections from './index.js';
import commonalities from '../../verblets/commonalities/index.js';
import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';

beforeEach(() => {
  vi.clearAllMocks();
  callLlm.mockResolvedValue(['element1', 'element2']);
  commonalities.mockResolvedValue(['shared trait A', 'shared trait B']);
  retry.mockImplementation(async (fn) => fn());
});

describe('intersections chain', () => {
  it.each([
    ['undefined', undefined],
    ['non-array', 'not an array'],
    ['empty array', []],
    ['single item', ['only one']],
  ])('returns empty object for %s input', async (_label, input) => {
    const result = await intersections(input);
    expect(result).toStrictEqual({});
    expect(callLlm).not.toHaveBeenCalled();
  });

  it('generates all combinations and builds result objects', async () => {
    callLlm.mockResolvedValue(['elm1', 'elm2']);
    commonalities.mockResolvedValue(['commonality one', 'commonality two']);

    const result = await intersections(['A', 'B', 'C']);

    // 3 items => 3 pairs + 1 triple = 4 combinations
    const keys = Object.keys(result);
    expect(keys).toHaveLength(4);
    expect(keys).toContain('A + B');
    expect(keys).toContain('A + B + C');

    const entry = result['A + B'];
    expect(entry.combination).toStrictEqual(['A', 'B']);
    expect(entry.description).toBe('commonality one, commonality two');
    expect(entry.elements).toStrictEqual(['elm1', 'elm2']);
  });

  it('converts non-array commonalities to string description', async () => {
    commonalities.mockResolvedValue('a single string response');
    const result = await intersections(['A', 'B']);
    expect(result['A + B'].description).toBe('a single string response');
  });

  it('respects minSize and maxSize to control combination sizes', async () => {
    // 4 items, only pairs (minSize=2, maxSize=2)
    const result = await intersections(['A', 'B', 'C', 'D'], { minSize: 2, maxSize: 2 });
    const keys = Object.keys(result);
    expect(keys).toHaveLength(6); // C(4,2) = 6
    expect(keys).not.toContain('A + B + C');
  });

  it('returns empty when minSize exceeds item count', async () => {
    const result = await intersections(['A', 'B'], { minSize: 5 });
    expect(result).toStrictEqual({});
    expect(callLlm).not.toHaveBeenCalled();
  });

  it('processes combinations in batches', async () => {
    await intersections(['A', 'B', 'C'], { batchSize: 2 });
    // All 4 combos processed regardless of batch size
    expect(callLlm).toHaveBeenCalledTimes(4);
    expect(commonalities).toHaveBeenCalledTimes(4);
  });

  it('passes json_schema response_format to callLlm', async () => {
    await intersections(['A', 'B']);
    const config = callLlm.mock.calls[0][1];
    expect(config.response_format.type).toBe('json_schema');
    expect(config.response_format.json_schema.name).toBe('intersection_elements');
  });

  it('includes instructions in prompt and forwards to commonalities', async () => {
    await intersections(['Fruit', 'Red'], { instructions: 'Focus on tropical items' });
    expect(callLlm.mock.calls[0][0]).toContain('Focus on tropical items');
    expect(commonalities.mock.calls[0][1].instructions).toBe('Focus on tropical items');
  });

  it('filters falsy elements from callLlm response', async () => {
    callLlm.mockResolvedValue([null, 'valid', undefined, '', 'also valid']);
    const result = await intersections(['A', 'B']);
    expect(result['A + B'].elements).toStrictEqual(['valid', 'also valid']);
  });

  it('returns empty elements when callLlm returns non-array', async () => {
    callLlm.mockResolvedValue('not an array');
    const result = await intersections(['A', 'B']);
    expect(result['A + B'].elements).toStrictEqual([]);
  });

  describe('schema validation', () => {
    it('returns validated results when useSchemaValidation is true', async () => {
      const validatedData = {
        'A + B': {
          combination: ['A', 'B'],
          description: 'validated',
          elements: ['v-elem'],
        },
      };
      callLlm.mockResolvedValueOnce(['elem1']);
      callLlm.mockResolvedValueOnce({ intersections: validatedData });

      const result = await intersections(['A', 'B'], { useSchemaValidation: true });
      expect(result).toStrictEqual(validatedData);
      expect(retry).toHaveBeenCalledTimes(2);
    });

    it('falls back to original results on validation failure', async () => {
      callLlm.mockResolvedValueOnce(['elem1']);
      callLlm.mockResolvedValueOnce(['invalid structure']);

      const result = await intersections(['A', 'B'], { useSchemaValidation: true });
      expect(result['A + B'].elements).toStrictEqual(['elem1']);
    });

    it('falls back when validation throws', async () => {
      callLlm.mockResolvedValueOnce(['elem1']);
      retry
        .mockImplementationOnce(async (fn) => fn())
        .mockRejectedValueOnce(new Error('validation failed'));

      const result = await intersections(['A', 'B'], { useSchemaValidation: true });
      expect(result['A + B'].elements).toStrictEqual(['elem1']);
    });
  });

  it('propagates errors from dependencies', async () => {
    retry.mockRejectedValue(new Error('LLM call failed'));
    await expect(intersections(['A', 'B'])).rejects.toThrow('LLM call failed');
  });
});
