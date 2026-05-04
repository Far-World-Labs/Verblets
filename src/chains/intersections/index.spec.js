import { vi, beforeEach, expect } from 'vitest';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

vi.mock('../../verblets/commonalities/index.js', () => ({ default: vi.fn() }));
vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));
vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn(async (fn) => fn()) }));

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

runTable({
  describe: 'intersections (short-circuit)',
  examples: [
    { name: 'undefined input', inputs: { input: undefined } },
    { name: 'non-array input', inputs: { input: 'not an array' } },
    { name: 'empty array input', inputs: { input: [] } },
    { name: 'single item input', inputs: { input: ['only one'] } },
  ],
  process: ({ inputs }) => intersections(inputs.input),
  expects: ({ result }) => {
    expect(result).toEqual({});
    expect(callLlm).not.toHaveBeenCalled();
  },
});

const validated = {
  'A + B': { combination: ['A', 'B'], description: 'validated', elements: ['v-elem'] },
};

runTable({
  describe: 'intersections chain',
  examples: [
    {
      name: 'generates all combinations and builds result objects',
      inputs: {
        list: ['A', 'B', 'C'],
        setup: () => {
          callLlm.mockResolvedValue(['elm1', 'elm2']);
          commonalities.mockResolvedValue(['commonality one', 'commonality two']);
        },
      },
      want: {
        keysLength: 4,
        keysContain: ['A + B', 'A + B + C'],
        entry: {
          'A + B': {
            combination: ['A', 'B'],
            description: 'commonality one, commonality two',
            elements: ['elm1', 'elm2'],
          },
        },
      },
    },
    {
      name: 'converts non-array commonalities to string description',
      inputs: {
        list: ['A', 'B'],
        setup: () => commonalities.mockResolvedValue('a single string response'),
      },
      want: { path: { 'A + B.description': 'a single string response' } },
    },
    {
      name: 'respects minSize and maxSize to control combination sizes',
      inputs: { list: ['A', 'B', 'C', 'D'], options: { minSize: 2, maxSize: 2 } },
      want: { keysLength: 6, keysNotContain: ['A + B + C'] },
    },
    {
      name: 'returns empty when minSize exceeds item count',
      inputs: { list: ['A', 'B'], options: { minSize: 5 } },
      want: { value: {}, noLlm: true },
    },
    {
      name: 'processes combinations in batches',
      inputs: { list: ['A', 'B', 'C'], options: { batchSize: 2 } },
      want: { llmCalls: 4, commonalitiesCalls: 4 },
    },
    {
      name: 'passes json_schema responseFormat to callLlm',
      inputs: { list: ['A', 'B'] },
      want: { schemaName: 'intersection_elements' },
    },
    {
      name: 'includes instructions in prompt and forwards to commonalities',
      inputs: { list: ['Fruit', 'Red'], instructions: 'Focus on tropical items' },
      want: {
        promptContains: ['Focus on tropical items'],
        commonalitiesArg1: 'Focus on tropical items',
      },
    },
    {
      name: 'wires instruction bundle context into prompt',
      inputs: {
        list: ['Fruit', 'Red'],
        instructions: { text: 'Focus on tropical items', region: 'Southeast Asia' },
      },
      want: { promptContains: ['Focus on tropical items', '<region>', 'Southeast Asia'] },
    },
    {
      name: 'filters falsy elements from callLlm response',
      inputs: {
        list: ['A', 'B'],
        setup: () => callLlm.mockResolvedValue([null, 'valid', undefined, '', 'also valid']),
      },
      want: { path: { 'A + B.elements': ['valid', 'also valid'] } },
    },
    {
      name: 'throws when callLlm returns non-array (single combo = total failure)',
      inputs: { list: ['A', 'B'], setup: () => callLlm.mockResolvedValue('not an array') },
      want: { throws: /all 1 combinations failed/ },
    },
    {
      name: 'throws when every combination fails (no successes to return)',
      inputs: {
        list: ['A', 'B'],
        setup: () => retry.mockRejectedValue(new Error('LLM call failed')),
      },
      want: { throws: /all 1 combinations failed/ },
    },
    {
      name: 'returns partial results when some combinations succeed',
      inputs: {
        list: ['A', 'B', 'C'],
        setup: () => {
          let call = 0;
          retry.mockImplementation(async (fn) => {
            call += 1;
            if (call === 1) throw new Error('first combo fail');
            return fn();
          });
          callLlm.mockResolvedValue(['elem']);
        },
      },
      want: { keysRange: [1, 4] },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setup?.();
    return intersections(inputs.list, inputs.instructions, inputs.options);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('value' in want) expect(result).toEqual(want.value);
    if (want.noLlm) expect(callLlm).not.toHaveBeenCalled();
    const keys = Object.keys(result);
    if ('keysLength' in want) expect(keys).toHaveLength(want.keysLength);
    if (want.keysContain) {
      for (const key of want.keysContain) expect(keys).toContain(key);
    }
    if (want.keysNotContain) {
      for (const key of want.keysNotContain) expect(keys).not.toContain(key);
    }
    if (want.keysRange) {
      expect(keys.length).toBeGreaterThan(want.keysRange[0] - 1);
      expect(keys.length).toBeLessThan(want.keysRange[1]);
    }
    if (want.entry) {
      for (const [key, shape] of Object.entries(want.entry)) {
        expect(result[key]).toMatchObject(shape);
      }
    }
    if (want.path) {
      for (const [path, value] of Object.entries(want.path)) {
        const [topKey, ...rest] = path.split('.');
        let actual = result[topKey];
        for (const seg of rest) actual = actual[seg];
        expect(actual).toEqual(value);
      }
    }
    if (want.schemaName) {
      const config = callLlm.mock.calls[0][1];
      expect(config.responseFormat.type).toBe('json_schema');
      expect(config.responseFormat.json_schema.name).toBe(want.schemaName);
    }
    if ('llmCalls' in want) expect(callLlm).toHaveBeenCalledTimes(want.llmCalls);
    if ('commonalitiesCalls' in want) {
      expect(commonalities).toHaveBeenCalledTimes(want.commonalitiesCalls);
    }
    if (want.commonalitiesArg1) {
      expect(commonalities.mock.calls[0][1]).toBe(want.commonalitiesArg1);
    }
    if (want.promptContains) {
      const prompt = callLlm.mock.calls[0][0];
      for (const fragment of want.promptContains) expect(prompt).toContain(fragment);
    }
  },
});

runTable({
  describe: 'intersections — schema validation',
  examples: [
    {
      name: 'returns validated results when useSchemaValidation is true',
      inputs: { list: ['A', 'B'], options: { useSchemaValidation: true } },
      mocks: { callLlm: [['elem1'], { intersections: validated }] },
      want: { value: validated, retryCalls: 2 },
    },
    {
      name: 'falls back to original results on validation failure',
      inputs: { list: ['A', 'B'], options: { useSchemaValidation: true } },
      mocks: { callLlm: [['elem1'], ['invalid structure']] },
      want: { elements: ['elem1'] },
    },
    {
      name: 'falls back when validation throws',
      inputs: {
        list: ['A', 'B'],
        options: { useSchemaValidation: true },
        setupRetry: () => {
          retry
            .mockImplementationOnce(async (fn) => fn())
            .mockRejectedValueOnce(new Error('validation failed'));
        },
      },
      mocks: { callLlm: [['elem1']] },
      want: { elements: ['elem1'] },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { callLlm });
    inputs.setupRetry?.();
    return intersections(inputs.list, inputs.options);
  },
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    if ('retryCalls' in want) expect(retry).toHaveBeenCalledTimes(want.retryCalls);
    if (want.elements) {
      expect(result['A + B'].elements).toEqual(want.elements);
    }
  },
});
