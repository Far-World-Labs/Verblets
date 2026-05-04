import { beforeEach, expect, vi } from 'vitest';
import reduce, { reduceItem } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import callLlm from '../../lib/llm/index.js';
import { ChainEvent, DomainEvent, OpEvent, Outcome } from '../../lib/progress/constants.js';
import { runTable } from '../../lib/examples-runner/index.js';

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

// ─── reduce (batched) ────────────────────────────────────────────────────

runTable({
  describe: 'reduce chain',
  examples: [
    {
      name: 'reduces in batches',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        instructions: 'join',
        options: { batchSize: 2 },
        want: 'a-b-c-d',
        wantBatchCalls: 2,
      },
    },
    {
      name: 'uses initial value',
      inputs: {
        list: ['x', 'y'],
        instructions: 'join',
        options: { initial: '0', batchSize: 2 },
        want: '0-x-y',
        wantBatchCalls: 1,
      },
    },
    {
      name: 'uses initial value with more elements',
      inputs: {
        list: ['x', 'y', 'z'],
        instructions: 'join',
        options: { initial: '0', batchSize: 2 },
        want: '0-x-y-z',
        wantBatchCalls: 2,
      },
    },
    {
      name: 'returns custom-format result directly without unwrapping accumulator',
      inputs: {
        list: ['a', 'b'],
        instructions: 'sum values',
        options: { batchSize: 2, responseFormat: statsFormat, initial: { sum: 0, count: 0 } },
        mock: () => listBatch.mockResolvedValueOnce({ sum: 10, count: 2 }),
        want: { sum: 10, count: 2 },
      },
    },
    {
      name: 'passes custom responseFormat through to listBatch',
      inputs: {
        list: ['a'],
        instructions: 'sum',
        options: { batchSize: 2, responseFormat: statsFormat },
        mock: () => listBatch.mockResolvedValueOnce({ sum: 5, count: 1 }),
        wantResponseFormat: statsFormat,
      },
    },
    {
      name: 'chains accumulator across batches with custom format',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        instructions: 'sum values',
        options: { batchSize: 2, responseFormat: statsFormat, initial: { sum: 0, count: 0 } },
        mock: () =>
          listBatch
            .mockResolvedValueOnce({ sum: 3, count: 2 })
            .mockResolvedValueOnce({ sum: 8, count: 4 }),
        want: { sum: 8, count: 4 },
        wantBatchCalls: 2,
        wantSecondPromptContains: '"sum":',
      },
    },
  ],
  process: async ({ list, instructions, options, mock }) => {
    if (mock) mock();
    return reduce(list, instructions, options);
  },
  expects: ({ result, inputs }) => {
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('wantBatchCalls' in inputs) {
      expect(listBatch).toHaveBeenCalledTimes(inputs.wantBatchCalls);
    }
    if (inputs.wantResponseFormat) {
      expect(listBatch.mock.calls[0][2].responseFormat).toBe(inputs.wantResponseFormat);
    }
    if (inputs.wantSecondPromptContains) {
      expect(listBatch.mock.calls[1][1]).toContain(inputs.wantSecondPromptContains);
    }
  },
});

// ─── reduce (progress events) ────────────────────────────────────────────

runTable({
  describe: 'reduce — incremental batch progress',
  examples: [
    {
      name: 'emits batch:complete events as each batch finishes',
      inputs: {
        list: ['a', 'b', 'c', 'd', 'e'],
        options: { batchSize: 2 },
        wantBatchEvents: 3,
        wantBatchProgressions: [
          { processedItems: 2, totalItems: 5 },
          { processedItems: 4 },
          { processedItems: 5 },
        ],
      },
    },
    {
      name: 'reports progress ratio on each batch event',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        options: { batchSize: 2 },
        wantBatchEvents: 2,
        wantBatchRatios: [0.5, 1.0],
      },
    },
    {
      name: 'brackets batch processing with operation start and complete',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        options: { batchSize: 2 },
        wantOpEvents: [
          { event: OpEvent.start, totalItems: 4, totalBatches: 2 },
          { event: OpEvent.complete, totalItems: 4 },
        ],
      },
    },
    {
      name: 'emits full lifecycle: start → input → batch:complete → output → complete',
      inputs: { list: ['a', 'b', 'c'], options: { batchSize: 2 }, wantLifecycle: true },
    },
    {
      name: 'complete event reports batch and item counts with success outcome',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        options: { batchSize: 2 },
        wantComplete: { totalItems: 4, totalBatches: 2, outcome: Outcome.success },
      },
    },
    {
      name: 'threads accumulator through batches with incremental tracking',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        options: { batchSize: 2, initial: 'start' },
        mock: () => {
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
        wantValue: 'start-a-b-c-d',
        wantAccumulators: ['start-a-b', 'start-a-b-c-d'],
        wantBatchEvents: 2,
        wantBatchProgressions: [{ processedItems: 2 }, { processedItems: 4 }],
      },
    },
  ],
  process: async ({ list, options, mock }) => {
    const accumulators = mock ? mock() : undefined;
    const events = [];
    const value = await reduce(list, 'join', {
      ...options,
      onProgress: (e) => events.push(e),
    });
    return { value, events, accumulators };
  },
  expects: ({ result, inputs }) => {
    const batches = result.events.filter(
      (e) => e.step === 'reduce' && e.event === OpEvent.batchComplete
    );
    if ('wantBatchEvents' in inputs) expect(batches).toHaveLength(inputs.wantBatchEvents);
    if (inputs.wantBatchProgressions) {
      inputs.wantBatchProgressions.forEach((shape, i) => {
        expect(batches[i]).toMatchObject(shape);
      });
    }
    if (inputs.wantBatchRatios) {
      inputs.wantBatchRatios.forEach((ratio, i) => {
        expect(batches[i].progress).toBeCloseTo(ratio);
      });
    }
    if (inputs.wantOpEvents) {
      const ops = result.events.filter(
        (e) => e.step === 'reduce' && (e.event === OpEvent.start || e.event === OpEvent.complete)
      );
      expect(ops).toHaveLength(inputs.wantOpEvents.length);
      inputs.wantOpEvents.forEach((shape, i) => expect(ops[i]).toMatchObject(shape));
    }
    if (inputs.wantLifecycle) {
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
    if (inputs.wantComplete) {
      const complete = result.events.find(
        (e) => e.step === 'reduce' && e.event === ChainEvent.complete
      );
      expect(complete).toMatchObject(inputs.wantComplete);
    }
    if ('wantValue' in inputs) expect(result.value).toBe(inputs.wantValue);
    if (inputs.wantAccumulators) {
      expect(result.accumulators).toEqual(inputs.wantAccumulators);
    }
  },
});

// ─── reduceItem ──────────────────────────────────────────────────────────

runTable({
  describe: 'reduceItem',
  examples: [
    {
      name: 'folds one item into the accumulator via one LLM call',
      inputs: {
        acc: 'a',
        item: 'b',
        instructions: 'concat with dash',
        mock: () => vi.mocked(callLlm).mockResolvedValueOnce({ accumulator: 'a-b' }),
        want: 'a-b',
        wantLlmCalls: 1,
        wantPromptContains: ['<accumulator>', '<item>'],
      },
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
        mock: () => vi.mocked(callLlm).mockResolvedValueOnce({ sum: 7, count: 2 }),
        want: { sum: 7, count: 2 },
      },
    },
    {
      name: 'throws when default-schema response is missing accumulator',
      inputs: {
        acc: 'seed',
        item: 'x',
        instructions: 'instructions',
        mock: () => vi.mocked(callLlm).mockResolvedValueOnce({}),
        throws: /missing required "accumulator"/,
      },
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
        mock: () => vi.mocked(callLlm).mockResolvedValueOnce(null),
        throws: /returned null under custom responseFormat/,
      },
    },
  ],
  process: async ({ acc, item, instructions, options, mock }) => {
    if (mock) mock();
    return reduceItem(acc, item, instructions, options);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('wantLlmCalls' in inputs) expect(callLlm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
    if (inputs.wantPromptContains) {
      const prompt = vi.mocked(callLlm).mock.calls[0][0];
      for (const fragment of inputs.wantPromptContains) expect(prompt).toContain(fragment);
    }
  },
});
