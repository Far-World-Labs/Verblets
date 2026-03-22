import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../verblets/commonalities/index.js', () => ({ default: vi.fn() }));
vi.mock('../../lib/llm/index.js', () => ({ default: vi.fn() }));
vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => fn()),
}));

import intersections from './index.js';
import commonalities from '../../verblets/commonalities/index.js';
import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';

beforeEach(() => {
  vi.clearAllMocks();

  // Default: callLlm returns an array of intersection elements
  callLlm.mockResolvedValue(['element1', 'element2']);

  // Default: commonalities returns a list of shared traits
  commonalities.mockResolvedValue(['shared trait A', 'shared trait B']);

  // Default: retry executes the function immediately (passthrough)
  retry.mockImplementation(async (fn) => fn());
});

describe('intersections chain', () => {
  describe('edge cases: returns empty for fewer than 2 items', () => {
    it('returns empty object for undefined input', async () => {
      const result = await intersections(undefined);
      expect(result).toStrictEqual({});
      expect(callLlm).not.toHaveBeenCalled();
      expect(commonalities).not.toHaveBeenCalled();
    });

    it('returns empty object for non-array input', async () => {
      const result = await intersections('not an array');
      expect(result).toStrictEqual({});
      expect(callLlm).not.toHaveBeenCalled();
    });

    it('returns empty object for empty array', async () => {
      const result = await intersections([]);
      expect(result).toStrictEqual({});
      expect(callLlm).not.toHaveBeenCalled();
    });

    it('returns empty object for single-item array', async () => {
      const result = await intersections(['only one']);
      expect(result).toStrictEqual({});
      expect(callLlm).not.toHaveBeenCalled();
      expect(commonalities).not.toHaveBeenCalled();
    });
  });

  describe('combination generation', () => {
    it('generates all pair combinations by default for 3 items', async () => {
      const items = ['A', 'B', 'C'];
      const result = await intersections(items);

      // 3 items, default minSize=2, maxSize=items.length=3
      // Pairs: [A,B], [A,C], [B,C] + Triple: [A,B,C] = 4 combinations
      const keys = Object.keys(result);
      expect(keys).toHaveLength(4);
      expect(keys).toContain('A + B');
      expect(keys).toContain('A + C');
      expect(keys).toContain('B + C');
      expect(keys).toContain('A + B + C');
    });

    it('generates only pairs for 2 items', async () => {
      const items = ['X', 'Y'];
      const result = await intersections(items);

      const keys = Object.keys(result);
      expect(keys).toHaveLength(1);
      expect(keys).toContain('X + Y');
    });

    it('builds result objects with combination, description, and elements', async () => {
      callLlm.mockResolvedValue(['elm1', 'elm2']);
      commonalities.mockResolvedValue(['commonality one', 'commonality two']);

      const result = await intersections(['Fruit', 'Red']);

      const entry = result['Fruit + Red'];
      expect(entry).toBeDefined();
      expect(entry.combination).toStrictEqual(['Fruit', 'Red']);
      expect(entry.description).toBe('commonality one, commonality two');
      expect(entry.elements).toStrictEqual(['elm1', 'elm2']);
    });

    it('joins commonalities array into comma-separated description', async () => {
      commonalities.mockResolvedValue(['trait1', 'trait2', 'trait3']);

      const result = await intersections(['A', 'B']);
      expect(result['A + B'].description).toBe('trait1, trait2, trait3');
    });

    it('converts non-array commonalities response to string description', async () => {
      commonalities.mockResolvedValue('a single string response');

      const result = await intersections(['A', 'B']);
      expect(result['A + B'].description).toBe('a single string response');
    });
  });

  describe('llm config forwarding', () => {
    it('forwards llm config to callLlm via retry', async () => {
      const llmConfig = { modelName: 'test-model', temperature: 0.5 };

      await intersections(['A', 'B'], { llm: llmConfig });

      // callLlm is called inside retry; verify the second arg has llm
      const callLlmArgs = callLlm.mock.calls[0];
      expect(callLlmArgs[1].llm).toBe(llmConfig);
    });

    it('forwards llm config to commonalities verblet', async () => {
      const llmConfig = { modelName: 'test-model' };

      await intersections(['A', 'B'], { llm: llmConfig });

      const commonalitiesArgs = commonalities.mock.calls[0];
      expect(commonalitiesArgs[1].llm).toBe(llmConfig);
    });

    it('uses default llm value of fastGoodCheap when not specified', async () => {
      await intersections(['A', 'B']);

      const callLlmArgs = callLlm.mock.calls[0];
      expect(callLlmArgs[1].llm).toBe('fastGoodCheap');

      const commonalitiesArgs = commonalities.mock.calls[0];
      expect(commonalitiesArgs[1].llm).toBe('fastGoodCheap');
    });
  });

  describe('retry options forwarding', () => {
    it('forwards maxAttempts to retry', async () => {
      await intersections(['A', 'B'], { maxAttempts: 7 });

      const retryOpts = retry.mock.calls[0][1];
      expect(retryOpts.maxAttempts).toBe(7);
      expect(retryOpts.label).toBe('intersections-elements');
    });

    it('forwards onProgress to retry', async () => {
      const onProgress = vi.fn();
      await intersections(['A', 'B'], { onProgress });

      const retryOpts = retry.mock.calls[0][1];
      expect(retryOpts.onProgress).toBe(onProgress);
    });

    it('forwards onProgress to commonalities', async () => {
      const onProgress = vi.fn();
      await intersections(['A', 'B'], { onProgress });

      const commonalitiesArgs = commonalities.mock.calls[0][1];
      expect(commonalitiesArgs.onProgress).toBe(onProgress);
    });

    it('uses default maxAttempts of 3 when not specified', async () => {
      await intersections(['A', 'B']);

      const retryOpts = retry.mock.calls[0][1];
      expect(retryOpts.maxAttempts).toBe(3);
    });
  });

  describe('batch processing', () => {
    it('processes all combinations in a single batch when batchSize >= total', async () => {
      // 3 items => 4 combinations (3 pairs + 1 triple)
      const items = ['A', 'B', 'C'];
      await intersections(items, { batchSize: 10 });

      // All 4 combos processed; each combo calls callLlm + commonalities in parallel
      expect(callLlm).toHaveBeenCalledTimes(4);
      expect(commonalities).toHaveBeenCalledTimes(4);
    });

    it('processes combinations in multiple batches when batchSize is small', async () => {
      // 3 items => 4 combinations, batchSize=2 => 2 batches
      const items = ['A', 'B', 'C'];
      await intersections(items, { batchSize: 2 });

      expect(callLlm).toHaveBeenCalledTimes(4);
      expect(commonalities).toHaveBeenCalledTimes(4);

      // Verify all 4 keys are present in results
      const result = await intersections(items, { batchSize: 2 });
      expect(Object.keys(result)).toHaveLength(4);
    });

    it('handles batchSize of 1 (sequential processing)', async () => {
      const items = ['A', 'B', 'C'];
      const result = await intersections(items, { batchSize: 1 });

      expect(Object.keys(result)).toHaveLength(4);
      expect(callLlm).toHaveBeenCalledTimes(4);
    });
  });

  describe('response_format with json_schema', () => {
    it('passes intersection_elements json_schema in modelOptions to callLlm', async () => {
      await intersections(['A', 'B']);

      const callLlmArgs = callLlm.mock.calls[0];
      const modelOptions = callLlmArgs[1].modelOptions;

      expect(modelOptions).toBeDefined();
      expect(modelOptions.response_format.type).toBe('json_schema');
      expect(modelOptions.response_format.json_schema.name).toBe('intersection_elements');
      expect(modelOptions.response_format.json_schema.schema).toBeDefined();
      expect(modelOptions.response_format.json_schema.schema.type).toBe('object');
      expect(modelOptions.response_format.json_schema.schema.properties.items).toBeDefined();
    });
  });

  describe('minSize and maxSize options', () => {
    it('respects custom minSize to skip smaller combinations', async () => {
      // 4 items with minSize=3 => only triples and the quadruple
      // Triples: [A,B,C], [A,B,D], [A,C,D], [B,C,D] + Quad: [A,B,C,D] = 5
      const items = ['A', 'B', 'C', 'D'];
      const result = await intersections(items, { minSize: 3 });

      const keys = Object.keys(result);
      expect(keys).toHaveLength(5);
      // No pairs should be present
      expect(keys).not.toContain('A + B');
      expect(keys).not.toContain('A + C');
      expect(keys).toContain('A + B + C');
      expect(keys).toContain('A + B + C + D');
    });

    it('respects custom maxSize to skip larger combinations', async () => {
      // 3 items with maxSize=2 => only pairs
      // Pairs: [A,B], [A,C], [B,C] = 3
      const items = ['A', 'B', 'C'];
      const result = await intersections(items, { maxSize: 2 });

      const keys = Object.keys(result);
      expect(keys).toHaveLength(3);
      expect(keys).not.toContain('A + B + C');
      expect(keys).toContain('A + B');
      expect(keys).toContain('A + C');
      expect(keys).toContain('B + C');
    });

    it('returns empty when minSize exceeds item count', async () => {
      const result = await intersections(['A', 'B'], { minSize: 5 });
      expect(result).toStrictEqual({});
      expect(callLlm).not.toHaveBeenCalled();
    });

    it('applies both minSize and maxSize together', async () => {
      // 4 items, minSize=2, maxSize=2 => only pairs
      // Pairs: [A,B],[A,C],[A,D],[B,C],[B,D],[C,D] = 6
      const items = ['A', 'B', 'C', 'D'];
      const result = await intersections(items, { minSize: 2, maxSize: 2 });

      expect(Object.keys(result)).toHaveLength(6);
    });
  });

  describe('useSchemaValidation path', () => {
    it('returns raw results when useSchemaValidation is false (default)', async () => {
      callLlm.mockResolvedValue(['elem1']);
      commonalities.mockResolvedValue(['desc']);

      const result = await intersections(['A', 'B']);

      // retry called once for the elements call (not for validation)
      expect(retry).toHaveBeenCalledTimes(1);
      expect(result['A + B']).toBeDefined();
      expect(result['A + B'].elements).toStrictEqual(['elem1']);
    });

    it('calls validation LLM when useSchemaValidation is true', async () => {
      // First call: elements extraction
      callLlm.mockResolvedValueOnce(['elem1']);
      // Second call: schema validation — returns structured response
      callLlm.mockResolvedValueOnce({
        intersections: {
          'A + B': {
            combination: ['A', 'B'],
            description: 'validated description',
            elements: ['validated-elem'],
          },
        },
      });

      await intersections(['A', 'B'], { useSchemaValidation: true });

      // retry called twice: once for elements, once for validation
      expect(retry).toHaveBeenCalledTimes(2);

      // Validation retry should have label 'intersections-validation'
      const validationRetryOpts = retry.mock.calls[1][1];
      expect(validationRetryOpts.label).toBe('intersections-validation');
    });

    it('returns validated results from schema validation', async () => {
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
    });

    it('falls back to original results when validation returns invalid structure', async () => {
      callLlm.mockResolvedValueOnce(['elem1']);
      // Validation returns an array instead of object — invalid
      callLlm.mockResolvedValueOnce(['not', 'an', 'object']);

      const result = await intersections(['A', 'B'], { useSchemaValidation: true });

      // Should fall back to original results
      expect(result['A + B']).toBeDefined();
      expect(result['A + B'].elements).toStrictEqual(['elem1']);
    });

    it('falls back to original results when validation throws', async () => {
      callLlm.mockResolvedValueOnce(['elem1']);

      // Make retry throw on second invocation (validation call)
      retry
        .mockImplementationOnce(async (fn) => fn())
        .mockRejectedValueOnce(new Error('validation LLM failed'));

      const result = await intersections(['A', 'B'], { useSchemaValidation: true });

      // Should fall back to original results
      expect(result['A + B']).toBeDefined();
      expect(result['A + B'].elements).toStrictEqual(['elem1']);
    });

    it('forwards llm and maxAttempts to validation retry', async () => {
      const llmConfig = { modelName: 'validation-model' };
      callLlm.mockResolvedValueOnce(['elem1']);
      callLlm.mockResolvedValueOnce({ intersections: {} });

      await intersections(['A', 'B'], {
        useSchemaValidation: true,
        llm: llmConfig,
        maxAttempts: 5,
      });

      // Validation callLlm should receive the llm config
      const validationCallArgs = callLlm.mock.calls[1];
      expect(validationCallArgs[1].llm).toBe(llmConfig);

      // Validation retry should get maxAttempts
      const validationRetryOpts = retry.mock.calls[1][1];
      expect(validationRetryOpts.maxAttempts).toBe(5);
    });

    it('uses intersection_result json_schema for validation modelOptions', async () => {
      callLlm.mockResolvedValueOnce(['elem1']);
      callLlm.mockResolvedValueOnce({ intersections: {} });

      await intersections(['A', 'B'], { useSchemaValidation: true });

      const validationCallArgs = callLlm.mock.calls[1];
      const modelOptions = validationCallArgs[1].modelOptions;
      expect(modelOptions.response_format.type).toBe('json_schema');
      expect(modelOptions.response_format.json_schema.name).toBe('intersection_result');
    });
  });

  describe('error handling', () => {
    it('propagates callLlm errors through retry', async () => {
      retry.mockRejectedValue(new Error('LLM call failed'));

      await expect(intersections(['A', 'B'])).rejects.toThrow('LLM call failed');
    });

    it('propagates commonalities errors', async () => {
      commonalities.mockRejectedValue(new Error('commonalities failed'));

      await expect(intersections(['A', 'B'])).rejects.toThrow('commonalities failed');
    });

    it('filters falsy elements from callLlm response', async () => {
      callLlm.mockResolvedValue([null, 'valid', undefined, '', 'also valid']);

      const result = await intersections(['A', 'B']);
      expect(result['A + B'].elements).toStrictEqual(['valid', 'also valid']);
    });

    it('returns empty elements array when callLlm returns non-array', async () => {
      callLlm.mockResolvedValue('not an array');

      const result = await intersections(['A', 'B']);
      expect(result['A + B'].elements).toStrictEqual([]);
    });

    it('returns empty elements array when callLlm returns null', async () => {
      callLlm.mockResolvedValue(null);

      const result = await intersections(['A', 'B']);
      expect(result['A + B'].elements).toStrictEqual([]);
    });
  });

  describe('restOptions forwarding', () => {
    it('forwards extra options to callLlm', async () => {
      await intersections(['A', 'B'], { customKey: 'customValue', temperature: 0.9 });

      const callLlmArgs = callLlm.mock.calls[0];
      expect(callLlmArgs[1].customKey).toBe('customValue');
      expect(callLlmArgs[1].temperature).toBe(0.9);
    });

    it('forwards extra options to commonalities', async () => {
      await intersections(['A', 'B'], { customKey: 'customValue', temperature: 0.9 });

      const commonalitiesArgs = commonalities.mock.calls[0][1];
      expect(commonalitiesArgs.customKey).toBe('customValue');
      expect(commonalitiesArgs.temperature).toBe(0.9);
    });

    it('does not forward intersections-specific options to callLlm', async () => {
      await intersections(['A', 'B'], {
        minSize: 2,
        maxSize: 3,
        batchSize: 5,
        useSchemaValidation: false,
      });

      const callLlmArgs = callLlm.mock.calls[0];
      expect(callLlmArgs[1].minSize).toBeUndefined();
      expect(callLlmArgs[1].maxSize).toBeUndefined();
      expect(callLlmArgs[1].batchSize).toBeUndefined();
      expect(callLlmArgs[1].useSchemaValidation).toBeUndefined();
    });

    it('does not forward intersections-specific options to commonalities', async () => {
      await intersections(['A', 'B'], {
        minSize: 2,
        maxSize: 3,
        batchSize: 5,
        useSchemaValidation: false,
      });

      const commonalitiesArgs = commonalities.mock.calls[0][1];
      expect(commonalitiesArgs.minSize).toBeUndefined();
      expect(commonalitiesArgs.maxSize).toBeUndefined();
      expect(commonalitiesArgs.batchSize).toBeUndefined();
      expect(commonalitiesArgs.useSchemaValidation).toBeUndefined();
    });
  });

  describe('instructions forwarding', () => {
    it('includes instructions in the callLlm prompt', async () => {
      await intersections(['Fruit', 'Red'], { instructions: 'Focus on tropical items' });

      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('Focus on tropical items');
      expect(prompt).toContain('Fruit');
      expect(prompt).toContain('Red');
    });

    it('forwards instructions to commonalities', async () => {
      await intersections(['A', 'B'], { instructions: 'special context' });

      const commonalitiesArgs = commonalities.mock.calls[0][1];
      expect(commonalitiesArgs.instructions).toBe('special context');
    });

    it('works without instructions', async () => {
      await intersections(['A', 'B']);

      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).not.toContain('Additional context');
    });
  });

  describe('now option forwarding', () => {
    it('forwards now to commonalities', async () => {
      const fixedDate = new Date('2025-06-15T00:00:00Z');
      await intersections(['A', 'B'], { now: fixedDate });

      const commonalitiesArgs = commonalities.mock.calls[0][1];
      expect(commonalitiesArgs.now).toBe(fixedDate);
    });
  });
});
