import { vi, beforeEach, expect } from 'vitest';
import { runTable } from '../../lib/examples-runner/index.js';

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

// ─── short-circuit returns ───────────────────────────────────────────────

runTable({
  describe: 'intersections (short-circuit)',
  examples: [
    { name: 'undefined input', inputs: { input: undefined } },
    { name: 'non-array input', inputs: { input: 'not an array' } },
    { name: 'empty array input', inputs: { input: [] } },
    { name: 'single item input', inputs: { input: ['only one'] } },
  ],
  process: ({ input }) => intersections(input),
  expects: ({ result }) => {
    expect(result).toEqual({});
    expect(callLlm).not.toHaveBeenCalled();
  },
});

// ─── intersections core behavior ────────────────────────────────────────

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
        mock: () => {
          callLlm.mockResolvedValue(['elm1', 'elm2']);
          commonalities.mockResolvedValue(['commonality one', 'commonality two']);
        },
        wantKeysLength: 4,
        wantKeysContain: ['A + B', 'A + B + C'],
        wantEntry: {
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
        mock: () => commonalities.mockResolvedValue('a single string response'),
        wantPath: { 'A + B.description': 'a single string response' },
      },
    },
    {
      name: 'respects minSize and maxSize to control combination sizes',
      inputs: {
        list: ['A', 'B', 'C', 'D'],
        options: { minSize: 2, maxSize: 2 },
        wantKeysLength: 6,
        wantKeysNotContain: ['A + B + C'],
      },
    },
    {
      name: 'returns empty when minSize exceeds item count',
      inputs: { list: ['A', 'B'], options: { minSize: 5 }, want: {}, wantNoLlm: true },
    },
    {
      name: 'processes combinations in batches',
      inputs: {
        list: ['A', 'B', 'C'],
        options: { batchSize: 2 },
        wantLlmCalls: 4,
        wantCommonalitiesCalls: 4,
      },
    },
    {
      name: 'passes json_schema responseFormat to callLlm',
      inputs: {
        list: ['A', 'B'],
        wantSchemaName: 'intersection_elements',
      },
    },
    {
      name: 'includes instructions in prompt and forwards to commonalities',
      inputs: {
        list: ['Fruit', 'Red'],
        instructions: 'Focus on tropical items',
        wantPromptContains: ['Focus on tropical items'],
        wantCommonalitiesArg1: 'Focus on tropical items',
      },
    },
    {
      name: 'wires instruction bundle context into prompt',
      inputs: {
        list: ['Fruit', 'Red'],
        instructions: { text: 'Focus on tropical items', region: 'Southeast Asia' },
        wantPromptContains: ['Focus on tropical items', '<region>', 'Southeast Asia'],
      },
    },
    {
      name: 'filters falsy elements from callLlm response',
      inputs: {
        list: ['A', 'B'],
        mock: () => callLlm.mockResolvedValue([null, 'valid', undefined, '', 'also valid']),
        wantPath: { 'A + B.elements': ['valid', 'also valid'] },
      },
    },
    {
      name: 'throws when callLlm returns non-array (single combo = total failure)',
      inputs: {
        list: ['A', 'B'],
        mock: () => callLlm.mockResolvedValue('not an array'),
        throws: /all 1 combinations failed/,
      },
    },
    {
      name: 'throws when every combination fails (no successes to return)',
      inputs: {
        list: ['A', 'B'],
        mock: () => retry.mockRejectedValue(new Error('LLM call failed')),
        throws: /all 1 combinations failed/,
      },
    },
    {
      name: 'returns partial results when some combinations succeed',
      inputs: {
        list: ['A', 'B', 'C'],
        mock: () => {
          let call = 0;
          retry.mockImplementation(async (fn) => {
            call += 1;
            if (call === 1) throw new Error('first combo fail');
            return fn();
          });
          callLlm.mockResolvedValue(['elem']);
        },
        wantKeysRange: [1, 4],
      },
    },
  ],
  process: async ({ list, instructions, options, mock }) => {
    if (mock) mock();
    return intersections(list, instructions, options);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if (inputs.wantNoLlm) expect(callLlm).not.toHaveBeenCalled();
    const keys = Object.keys(result);
    if ('wantKeysLength' in inputs) expect(keys).toHaveLength(inputs.wantKeysLength);
    if (inputs.wantKeysContain) {
      for (const key of inputs.wantKeysContain) expect(keys).toContain(key);
    }
    if (inputs.wantKeysNotContain) {
      for (const key of inputs.wantKeysNotContain) expect(keys).not.toContain(key);
    }
    if (inputs.wantKeysRange) {
      expect(keys.length).toBeGreaterThan(inputs.wantKeysRange[0] - 1);
      expect(keys.length).toBeLessThan(inputs.wantKeysRange[1]);
    }
    if (inputs.wantEntry) {
      for (const [key, shape] of Object.entries(inputs.wantEntry)) {
        expect(result[key]).toMatchObject(shape);
      }
    }
    if (inputs.wantPath) {
      for (const [path, value] of Object.entries(inputs.wantPath)) {
        const [topKey, ...rest] = path.split('.');
        let actual = result[topKey];
        for (const seg of rest) actual = actual[seg];
        expect(actual).toEqual(value);
      }
    }
    if (inputs.wantSchemaName) {
      const config = callLlm.mock.calls[0][1];
      expect(config.responseFormat.type).toBe('json_schema');
      expect(config.responseFormat.json_schema.name).toBe(inputs.wantSchemaName);
    }
    if ('wantLlmCalls' in inputs) expect(callLlm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
    if ('wantCommonalitiesCalls' in inputs) {
      expect(commonalities).toHaveBeenCalledTimes(inputs.wantCommonalitiesCalls);
    }
    if (inputs.wantCommonalitiesArg1) {
      expect(commonalities.mock.calls[0][1]).toBe(inputs.wantCommonalitiesArg1);
    }
    if (inputs.wantPromptContains) {
      const prompt = callLlm.mock.calls[0][0];
      for (const fragment of inputs.wantPromptContains) expect(prompt).toContain(fragment);
    }
  },
});

// ─── schema validation ──────────────────────────────────────────────────

runTable({
  describe: 'intersections — schema validation',
  examples: [
    {
      name: 'returns validated results when useSchemaValidation is true',
      inputs: {
        list: ['A', 'B'],
        options: { useSchemaValidation: true },
        mock: () => {
          callLlm.mockResolvedValueOnce(['elem1']);
          callLlm.mockResolvedValueOnce({ intersections: validated });
        },
        want: validated,
        wantRetryCalls: 2,
      },
    },
    {
      name: 'falls back to original results on validation failure',
      inputs: {
        list: ['A', 'B'],
        options: { useSchemaValidation: true },
        mock: () => {
          callLlm.mockResolvedValueOnce(['elem1']);
          callLlm.mockResolvedValueOnce(['invalid structure']);
        },
        wantElements: ['elem1'],
      },
    },
    {
      name: 'falls back when validation throws',
      inputs: {
        list: ['A', 'B'],
        options: { useSchemaValidation: true },
        mock: () => {
          callLlm.mockResolvedValueOnce(['elem1']);
          retry
            .mockImplementationOnce(async (fn) => fn())
            .mockRejectedValueOnce(new Error('validation failed'));
        },
        wantElements: ['elem1'],
      },
    },
  ],
  process: async ({ list, options, mock }) => {
    if (mock) mock();
    return intersections(list, options);
  },
  expects: ({ result, inputs }) => {
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('wantRetryCalls' in inputs) expect(retry).toHaveBeenCalledTimes(inputs.wantRetryCalls);
    if (inputs.wantElements) {
      expect(result['A + B'].elements).toEqual(inputs.wantElements);
    }
  },
});
