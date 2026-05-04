import { beforeEach, expect, vi } from 'vitest';
import reduce, { reduceItem } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import callLlm from '../../lib/llm/index.js';
import { ChainEvent, DomainEvent, OpEvent, Outcome } from '../../lib/progress/constants.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', async (importOriginal) => ({
  ...(await importOriginal()),
  default: vi.fn(),
}));

vi.mock('../../lib/text-batch/index.js', () => ({
  default: vi.fn((list) => {
    const batches = [];
    for (let i = 0; i < list.length; i += 2) {
      batches.push({ items: list.slice(i, i + 2), startIndex: i });
    }
    return batches;
  }),
}));

vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn(async (fn) => fn()) }));

vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(async (items, instructions) => {
    const text =
      typeof instructions === 'function'
        ? instructions({ style: 'newline', count: items.length })
        : instructions;
    const accMatch = text.match(/<accumulator>(.*?)<\/accumulator>/s);
    let acc = accMatch ? accMatch[1].trim() : '';
    if (acc.includes('No initial value')) acc = '';
    return { accumulator: [acc, ...items].filter(Boolean).join('-') };
  }),
  ListStyle: { NEWLINE: 'newline', XML: 'xml', AUTO: 'auto' },
  determineStyle: vi.fn(() => 'newline'),
}));

beforeEach(() => vi.clearAllMocks());

const statsFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'stats',
    schema: {
      type: 'object',
      properties: { sum: { type: 'number' }, count: { type: 'number' } },
      required: ['sum', 'count'],
      additionalProperties: false,
    },
  },
};

runTable({
  describe: 'reduce chain',
  examples: [
    {
      name: 'reduces in batches',
      inputs: { list: ['a', 'b', 'c', 'd'], instructions: 'join', options: { batchSize: 2 } },
      want: { value: 'a-b-c-d', batchCalls: 2 },
    },
    {
      name: 'uses initial value',
      inputs: { list: ['x', 'y'], instructions: 'join', options: { initial: '0', batchSize: 2 } },
      want: { value: '0-x-y', batchCalls: 1 },
    },
    {
      name: 'uses initial value with more elements',
      inputs: {
        list: ['x', 'y', 'z'],
        instructions: 'join',
        options: { initial: '0', batchSize: 2 },
      },
      want: { value: '0-x-y-z', batchCalls: 2 },
    },
    {
      name: 'returns custom-format result directly without unwrapping accumulator',
      inputs: {
        list: ['a', 'b'],
        instructions: 'sum values',
        options: { batchSize: 2, responseFormat: statsFormat, initial: { sum: 0, count: 0 } },
      },
      mocks: { listBatch: [{ sum: 10, count: 2 }] },
      want: { value: { sum: 10, count: 2 } },
    },
    {
      name: 'passes custom responseFormat through to listBatch',
      inputs: {
        list: ['a'],
        instructions: 'sum',
        options: { batchSize: 2, responseFormat: statsFormat },
      },
      mocks: { listBatch: [{ sum: 5, count: 1 }] },
      want: { responseFormat: statsFormat },
    },
    {
      name: 'chains accumulator across batches with custom format',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        instructions: 'sum values',
        options: { batchSize: 2, responseFormat: statsFormat, initial: { sum: 0, count: 0 } },
      },
      mocks: {
        listBatch: [
          { sum: 3, count: 2 },
          { sum: 8, count: 4 },
        ],
      },
      want: { value: { sum: 8, count: 4 }, batchCalls: 2, secondPromptContains: '"sum":' },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { listBatch });
    return reduce(inputs.list, inputs.instructions, inputs.options);
  },
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    if ('batchCalls' in want) {
      expect(listBatch).toHaveBeenCalledTimes(want.batchCalls);
    }
    if (want.responseFormat) {
      expect(listBatch.mock.calls[0][2].responseFormat).toBe(want.responseFormat);
    }
    if (want.secondPromptContains) {
      expect(listBatch.mock.calls[1][1]).toContain(want.secondPromptContains);
    }
  },
});

runTable({
  describe: 'reduce — incremental batch progress',
  examples: [
    {
      name: 'emits batch:complete events as each batch finishes',
      inputs: { list: ['a', 'b', 'c', 'd', 'e'], options: { batchSize: 2 } },
      want: {
        batchEvents: 3,
        batchProgressions: [
          { processedItems: 2, totalItems: 5 },
          { processedItems: 4 },
          { processedItems: 5 },
        ],
      },
    },
    {
      name: 'reports progress ratio on each batch event',
      inputs: { list: ['a', 'b', 'c', 'd'], options: { batchSize: 2 } },
      want: { batchEvents: 2, batchRatios: [0.5, 1.0] },
    },
    {
      name: 'brackets batch processing with operation start and complete',
      inputs: { list: ['a', 'b', 'c', 'd'], options: { batchSize: 2 } },
      want: {
        opEvents: [
          { event: OpEvent.start, totalItems: 4, totalBatches: 2 },
          { event: OpEvent.complete, totalItems: 4 },
        ],
      },
    },
    {
      name: 'emits full lifecycle: start → input → batch:complete → output → complete',
      inputs: { list: ['a', 'b', 'c'], options: { batchSize: 2 } },
      want: { lifecycle: true },
    },
    {
      name: 'complete event reports batch and item counts with success outcome',
      inputs: { list: ['a', 'b', 'c', 'd'], options: { batchSize: 2 } },
      want: { complete: { totalItems: 4, totalBatches: 2, outcome: Outcome.success } },
    },
    {
      name: 'threads accumulator through batches with incremental tracking',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        options: { batchSize: 2, initial: 'start' },
        setupAcc: () => {
          const seen = [];
          listBatch.mockImplementation(async (items, instructions) => {
            const accMatch = instructions.match(/<accumulator>(.*?)<\/accumulator>/s);
            const acc = accMatch ? accMatch[1].trim() : '';
            const next = [acc, ...items].filter(Boolean).join('-');
            seen.push(next);
            return { accumulator: next };
          });
          return seen;
        },
      },
      want: {
        value: 'start-a-b-c-d',
        accumulators: ['start-a-b', 'start-a-b-c-d'],
        batchEvents: 2,
        batchProgressions: [{ processedItems: 2 }, { processedItems: 4 }],
      },
    },
  ],
  process: async ({ inputs }) => {
    const accumulators = inputs.setupAcc?.();
    const events = [];
    const value = await reduce(inputs.list, 'join', {
      ...inputs.options,
      onProgress: (e) => events.push(e),
    });
    return { value, events, accumulators };
  },
  expects: ({ result, want }) => {
    const batches = result.events.filter(
      (e) => e.step === 'reduce' && e.event === OpEvent.batchComplete
    );
    if ('batchEvents' in want) expect(batches).toHaveLength(want.batchEvents);
    if (want.batchProgressions) {
      want.batchProgressions.forEach((shape, i) => {
        expect(batches[i]).toMatchObject(shape);
      });
    }
    if (want.batchRatios) {
      want.batchRatios.forEach((ratio, i) => {
        expect(batches[i].progress).toBeCloseTo(ratio);
      });
    }
    if (want.opEvents) {
      const ops = result.events.filter(
        (e) => e.step === 'reduce' && (e.event === OpEvent.start || e.event === OpEvent.complete)
      );
      expect(ops).toHaveLength(want.opEvents.length);
      want.opEvents.forEach((shape, i) => expect(ops[i]).toMatchObject(shape));
    }
    if (want.lifecycle) {
      const names = result.events.filter((e) => e.step === 'reduce').map((e) => e.event);
      expect(names[0]).toBe(ChainEvent.start);
      expect(names).toContain(DomainEvent.input);
      expect(names).toContain(OpEvent.batchComplete);
      expect(names).toContain(DomainEvent.output);
      expect(names[names.length - 1]).toBe(ChainEvent.complete);
      const inputIdx = names.indexOf(DomainEvent.input);
      const outputIdx = names.indexOf(DomainEvent.output);
      const batchIdx = names.indexOf(OpEvent.batchComplete);
      expect(batchIdx).toBeGreaterThan(inputIdx);
      expect(batchIdx).toBeLessThan(outputIdx);
    }
    if (want.complete) {
      const complete = result.events.find(
        (e) => e.step === 'reduce' && e.event === ChainEvent.complete
      );
      expect(complete).toMatchObject(want.complete);
    }
    if ('value' in want) expect(result.value).toBe(want.value);
    if (want.accumulators) {
      expect(result.accumulators).toEqual(want.accumulators);
    }
  },
});

runTable({
  describe: 'reduceItem',
  examples: [
    {
      name: 'folds one item into the accumulator via one LLM call',
      inputs: { acc: 'a', item: 'b', instructions: 'concat with dash' },
      mocks: { callLlm: [{ accumulator: 'a-b' }] },
      want: { value: 'a-b', llmCalls: 1, promptContains: ['<accumulator>', '<item>'] },
    },
    {
      name: 'returns custom-format result directly without unwrapping',
      inputs: {
        acc: { sum: 5, count: 1 },
        item: 'two',
        instructions: 'add',
        options: {
          responseFormat: { type: 'json_schema', json_schema: { name: 'stats', schema: {} } },
        },
      },
      mocks: { callLlm: [{ sum: 7, count: 2 }] },
      want: { value: { sum: 7, count: 2 } },
    },
    {
      name: 'throws when default-schema response is missing accumulator',
      inputs: { acc: 'seed', item: 'x', instructions: 'instructions' },
      mocks: { callLlm: [{}] },
      want: { throws: /missing required "accumulator"/ },
    },
    {
      name: 'throws when custom-format response is null',
      inputs: {
        acc: 'a',
        item: 'b',
        instructions: 'x',
        options: {
          responseFormat: { type: 'json_schema', json_schema: { name: 's', schema: {} } },
        },
      },
      mocks: { callLlm: [null] },
      want: { throws: /returned null under custom responseFormat/ },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { callLlm });
    return reduceItem(inputs.acc, inputs.item, inputs.instructions, inputs.options);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('value' in want) expect(result).toEqual(want.value);
    if ('llmCalls' in want) expect(callLlm).toHaveBeenCalledTimes(want.llmCalls);
    if (want.promptContains) {
      const prompt = vi.mocked(callLlm).mock.calls[0][0];
      for (const fragment of want.promptContains) expect(prompt).toContain(fragment);
    }
  },
});
