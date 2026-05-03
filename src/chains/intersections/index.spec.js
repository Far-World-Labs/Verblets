import { vi, beforeEach, expect } from 'vitest';
import { runTable, throws } from '../../lib/examples-runner/index.js';

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

// ─── short-circuit returns ────────────────────────────────────────────────

runTable({
  describe: 'intersections (short-circuit)',
  examples: [
    { name: 'undefined input', inputs: { input: undefined } },
    { name: 'non-array input', inputs: { input: 'not an array' } },
    { name: 'empty array input', inputs: { input: [] } },
    { name: 'single item input', inputs: { input: ['only one'] } },
  ].map((row) => ({
    ...row,
    check: ({ result }) => {
      expect(result).toStrictEqual({});
      expect(callLlm).not.toHaveBeenCalled();
    },
  })),
  process: ({ input }) => intersections(input),
});

// ─── core behavior ────────────────────────────────────────────────────────

runTable({
  describe: 'intersections chain',
  examples: [
    {
      name: 'generates all combinations and builds result objects',
      inputs: {
        list: ['A', 'B', 'C'],
        preMock: () => {
          callLlm.mockResolvedValue(['elm1', 'elm2']);
          commonalities.mockResolvedValue(['commonality one', 'commonality two']);
        },
      },
      check: ({ result }) => {
        const keys = Object.keys(result);
        expect(keys).toHaveLength(4);
        expect(keys).toContain('A + B');
        expect(keys).toContain('A + B + C');
        expect(result['A + B']).toMatchObject({
          combination: ['A', 'B'],
          description: 'commonality one, commonality two',
          elements: ['elm1', 'elm2'],
        });
      },
    },
    {
      name: 'converts non-array commonalities to string description',
      inputs: {
        list: ['A', 'B'],
        preMock: () => commonalities.mockResolvedValue('a single string response'),
      },
      check: ({ result }) => expect(result['A + B'].description).toBe('a single string response'),
    },
    {
      name: 'respects minSize and maxSize to control combination sizes',
      inputs: { list: ['A', 'B', 'C', 'D'], options: { minSize: 2, maxSize: 2 } },
      check: ({ result }) => {
        const keys = Object.keys(result);
        expect(keys).toHaveLength(6);
        expect(keys).not.toContain('A + B + C');
      },
    },
    {
      name: 'returns empty when minSize exceeds item count',
      inputs: { list: ['A', 'B'], options: { minSize: 5 } },
      check: ({ result }) => {
        expect(result).toStrictEqual({});
        expect(callLlm).not.toHaveBeenCalled();
      },
    },
    {
      name: 'processes combinations in batches',
      inputs: { list: ['A', 'B', 'C'], options: { batchSize: 2 } },
      check: () => {
        expect(callLlm).toHaveBeenCalledTimes(4);
        expect(commonalities).toHaveBeenCalledTimes(4);
      },
    },
    {
      name: 'passes json_schema responseFormat to callLlm',
      inputs: { list: ['A', 'B'] },
      check: () => {
        const config = callLlm.mock.calls[0][1];
        expect(config.responseFormat.type).toBe('json_schema');
        expect(config.responseFormat.json_schema.name).toBe('intersection_elements');
      },
    },
    {
      name: 'includes instructions in prompt and forwards to commonalities',
      inputs: { list: ['Fruit', 'Red'], instructions: 'Focus on tropical items' },
      check: () => {
        expect(callLlm.mock.calls[0][0]).toContain('Focus on tropical items');
        expect(commonalities.mock.calls[0][1]).toBe('Focus on tropical items');
      },
    },
    {
      name: 'wires instruction bundle context into prompt',
      inputs: {
        list: ['Fruit', 'Red'],
        instructions: { text: 'Focus on tropical items', region: 'Southeast Asia' },
      },
      check: () => {
        expect(callLlm.mock.calls[0][0]).toContain('Focus on tropical items');
        expect(callLlm.mock.calls[0][0]).toContain('<region>');
        expect(callLlm.mock.calls[0][0]).toContain('Southeast Asia');
      },
    },
    {
      name: 'filters falsy elements from callLlm response',
      inputs: {
        list: ['A', 'B'],
        preMock: () => callLlm.mockResolvedValue([null, 'valid', undefined, '', 'also valid']),
      },
      check: ({ result }) =>
        expect(result['A + B'].elements).toStrictEqual(['valid', 'also valid']),
    },
    {
      name: 'throws when callLlm returns non-array (single combo = total failure)',
      inputs: {
        list: ['A', 'B'],
        preMock: () => callLlm.mockResolvedValue('not an array'),
      },
      check: throws(/all 1 combinations failed/),
    },
    {
      name: 'throws when every combination fails (no successes to return)',
      inputs: {
        list: ['A', 'B'],
        preMock: () => retry.mockRejectedValue(new Error('LLM call failed')),
      },
      check: throws(/all 1 combinations failed/),
    },
    {
      name: 'returns partial results when some combinations succeed',
      inputs: {
        list: ['A', 'B', 'C'],
        preMock: () => {
          let call = 0;
          retry.mockImplementation(async (fn) => {
            call += 1;
            if (call === 1) throw new Error('first combo fail');
            return fn();
          });
          callLlm.mockResolvedValue(['elem']);
        },
      },
      check: ({ result }) => {
        const keys = Object.keys(result);
        expect(keys.length).toBeGreaterThan(0);
        expect(keys.length).toBeLessThan(4);
      },
    },
  ],
  process: async ({ list, instructions, options, preMock }) => {
    if (preMock) preMock();
    return intersections(list, instructions, options);
  },
});

// ─── schema validation ───────────────────────────────────────────────────

runTable({
  describe: 'intersections — schema validation',
  examples: [
    (() => {
      const validated = {
        'A + B': { combination: ['A', 'B'], description: 'validated', elements: ['v-elem'] },
      };
      return {
        name: 'returns validated results when useSchemaValidation is true',
        inputs: {
          list: ['A', 'B'],
          options: { useSchemaValidation: true },
          preMock: () => {
            callLlm.mockResolvedValueOnce(['elem1']);
            callLlm.mockResolvedValueOnce({ intersections: validated });
          },
        },
        check: ({ result }) => {
          expect(result).toStrictEqual(validated);
          expect(retry).toHaveBeenCalledTimes(2);
        },
      };
    })(),
    {
      name: 'falls back to original results on validation failure',
      inputs: {
        list: ['A', 'B'],
        options: { useSchemaValidation: true },
        preMock: () => {
          callLlm.mockResolvedValueOnce(['elem1']);
          callLlm.mockResolvedValueOnce(['invalid structure']);
        },
      },
      check: ({ result }) => expect(result['A + B'].elements).toStrictEqual(['elem1']),
    },
    {
      name: 'falls back when validation throws',
      inputs: {
        list: ['A', 'B'],
        options: { useSchemaValidation: true },
        preMock: () => {
          callLlm.mockResolvedValueOnce(['elem1']);
          retry
            .mockImplementationOnce(async (fn) => fn())
            .mockRejectedValueOnce(new Error('validation failed'));
        },
      },
      check: ({ result }) => expect(result['A + B'].elements).toStrictEqual(['elem1']),
    },
  ],
  process: async ({ list, options, preMock }) => {
    if (preMock) preMock();
    return intersections(list, options);
  },
});
