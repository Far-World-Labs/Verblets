import { beforeEach, expect, vi } from 'vitest';
import reduce, { reduceItem } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import callLlm from '../../lib/llm/index.js';
import { ChainEvent, DomainEvent, OpEvent, Outcome } from '../../lib/progress/constants.js';
import { runTable, equals, all, throws } from '../../lib/examples-runner/index.js';

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

// ─── reduce (batched) ─────────────────────────────────────────────────────

const reduceExamples = [
  {
    name: 'reduces in batches',
    inputs: { list: ['a', 'b', 'c', 'd'], instructions: 'join', options: { batchSize: 2 } },
    check: all(equals('a-b-c-d'), () => expect(listBatch).toHaveBeenCalledTimes(2)),
  },
  {
    name: 'uses initial value',
    inputs: {
      list: ['x', 'y'],
      instructions: 'join',
      options: { initial: '0', batchSize: 2 },
    },
    check: all(equals('0-x-y'), () => expect(listBatch).toHaveBeenCalledTimes(1)),
  },
  {
    name: 'uses initial value with more elements',
    inputs: {
      list: ['x', 'y', 'z'],
      instructions: 'join',
      options: { initial: '0', batchSize: 2 },
    },
    check: all(equals('0-x-y-z'), () => expect(listBatch).toHaveBeenCalledTimes(2)),
  },
  {
    name: 'returns custom-format result directly without unwrapping accumulator',
    inputs: {
      list: ['a', 'b'],
      instructions: 'sum values',
      options: { batchSize: 2, responseFormat: statsFormat, initial: { sum: 0, count: 0 } },
      preMock: () => listBatch.mockResolvedValueOnce({ sum: 10, count: 2 }),
    },
    check: equals({ sum: 10, count: 2 }),
  },
  {
    name: 'passes custom responseFormat through to listBatch',
    inputs: {
      list: ['a'],
      instructions: 'sum',
      options: { batchSize: 2, responseFormat: statsFormat },
      preMock: () => listBatch.mockResolvedValueOnce({ sum: 5, count: 1 }),
    },
    check: () => expect(listBatch.mock.calls[0][2].responseFormat).toBe(statsFormat),
  },
  {
    name: 'chains accumulator across batches with custom format',
    inputs: {
      list: ['a', 'b', 'c', 'd'],
      instructions: 'sum values',
      options: { batchSize: 2, responseFormat: statsFormat, initial: { sum: 0, count: 0 } },
      preMock: () =>
        listBatch
          .mockResolvedValueOnce({ sum: 3, count: 2 })
          .mockResolvedValueOnce({ sum: 8, count: 4 }),
    },
    check: all(equals({ sum: 8, count: 4 }), () => {
      expect(listBatch).toHaveBeenCalledTimes(2);
      expect(listBatch.mock.calls[1][1]).toContain('"sum":');
    }),
  },
];

runTable({
  describe: 'reduce chain',
  examples: reduceExamples,
  process: async ({ list, instructions, options, preMock }) => {
    if (preMock) preMock();
    return reduce(list, instructions, options);
  },
});

// ─── reduce (progress events) ─────────────────────────────────────────────

const progressExamples = [
  {
    name: 'emits batch:complete events as each batch finishes',
    inputs: { list: ['a', 'b', 'c', 'd', 'e'], options: { batchSize: 2 } },
    check: ({ result }) => {
      const batches = result.events.filter(
        (e) => e.step === 'reduce' && e.event === OpEvent.batchComplete
      );
      expect(batches).toHaveLength(3);
      expect(batches[0]).toMatchObject({ processedItems: 2, totalItems: 5 });
      expect(batches[1].processedItems).toBe(4);
      expect(batches[2].processedItems).toBe(5);
    },
  },
  {
    name: 'reports progress ratio on each batch event',
    inputs: { list: ['a', 'b', 'c', 'd'], options: { batchSize: 2 } },
    check: ({ result }) => {
      const batches = result.events.filter(
        (e) => e.step === 'reduce' && e.event === OpEvent.batchComplete
      );
      expect(batches).toHaveLength(2);
      expect(batches[0].progress).toBeCloseTo(0.5);
      expect(batches[1].progress).toBeCloseTo(1.0);
    },
  },
  {
    name: 'brackets batch processing with operation start and complete',
    inputs: { list: ['a', 'b', 'c', 'd'], options: { batchSize: 2 } },
    check: ({ result }) => {
      const ops = result.events.filter(
        (e) => e.step === 'reduce' && (e.event === OpEvent.start || e.event === OpEvent.complete)
      );
      expect(ops).toHaveLength(2);
      expect(ops[0]).toMatchObject({
        event: OpEvent.start,
        totalItems: 4,
        totalBatches: 2,
      });
      expect(ops[1]).toMatchObject({ event: OpEvent.complete, totalItems: 4 });
    },
  },
  {
    name: 'emits full lifecycle: start → input → batch:complete → output → complete',
    inputs: { list: ['a', 'b', 'c'], options: { batchSize: 2 } },
    check: ({ result }) => {
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
    },
  },
  {
    name: 'complete event reports batch and item counts with success outcome',
    inputs: { list: ['a', 'b', 'c', 'd'], options: { batchSize: 2 } },
    check: ({ result }) => {
      const complete = result.events.find(
        (e) => e.step === 'reduce' && e.event === ChainEvent.complete
      );
      expect(complete).toMatchObject({
        totalItems: 4,
        totalBatches: 2,
        outcome: Outcome.success,
      });
    },
  },
  {
    name: 'threads accumulator through batches with incremental tracking',
    inputs: {
      list: ['a', 'b', 'c', 'd'],
      options: { batchSize: 2, initial: 'start' },
      preMock: () => {
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
    check: ({ result }) => {
      expect(result.value).toBe('start-a-b-c-d');
      expect(result.accumulators).toEqual(['start-a-b', 'start-a-b-c-d']);
      const batches = result.events.filter(
        (e) => e.step === 'reduce' && e.event === OpEvent.batchComplete
      );
      expect(batches).toHaveLength(2);
      expect(batches[0].processedItems).toBe(2);
      expect(batches[1].processedItems).toBe(4);
    },
  },
];

runTable({
  describe: 'reduce — incremental batch progress',
  examples: progressExamples,
  process: async ({ list, options, preMock }) => {
    const accumulators = preMock ? preMock() : undefined;
    const events = [];
    const value = await reduce(list, 'join', {
      ...options,
      onProgress: (e) => events.push(e),
    });
    return { value, events, accumulators };
  },
});

// ─── reduceItem ───────────────────────────────────────────────────────────

const reduceItemExamples = [
  {
    name: 'folds one item into the accumulator via one LLM call',
    inputs: {
      acc: 'a',
      item: 'b',
      instructions: 'concat with dash',
      preMock: () => vi.mocked(callLlm).mockResolvedValueOnce({ accumulator: 'a-b' }),
    },
    check: all(equals('a-b'), () => {
      expect(callLlm).toHaveBeenCalledTimes(1);
      const prompt = vi.mocked(callLlm).mock.calls[0][0];
      expect(prompt).toContain('<accumulator>');
      expect(prompt).toContain('<item>');
    }),
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
      preMock: () => vi.mocked(callLlm).mockResolvedValueOnce({ sum: 7, count: 2 }),
    },
    check: equals({ sum: 7, count: 2 }),
  },
  {
    name: 'throws when default-schema response is missing accumulator',
    inputs: {
      acc: 'seed',
      item: 'x',
      instructions: 'instructions',
      preMock: () => vi.mocked(callLlm).mockResolvedValueOnce({}),
    },
    check: throws(/missing required "accumulator"/),
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
      preMock: () => vi.mocked(callLlm).mockResolvedValueOnce(null),
    },
    check: throws(/returned null under custom responseFormat/),
  },
];

runTable({
  describe: 'reduceItem',
  examples: reduceItemExamples,
  process: async ({ acc, item, instructions, options, preMock }) => {
    if (preMock) preMock();
    return reduceItem(acc, item, instructions, options);
  },
});
