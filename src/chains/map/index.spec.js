import { beforeEach, vi, expect } from 'vitest';
import map, { streamingMap, mapItem, mapParallel } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import callLlm from '../../lib/llm/index.js';
import { OpEvent, ChainEvent, DomainEvent } from '../../lib/progress/constants.js';
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

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn, opts = {}) => {
    const onProgress = opts.onProgress ?? opts.config?.onProgress;
    if (onProgress) {
      onProgress({ step: opts.label || 'retry', event: OpEvent.start, attemptNumber: 1 });
    }
    const result = await fn();
    if (onProgress) {
      onProgress({
        step: opts.label || 'retry',
        event: OpEvent.complete,
        attemptNumber: 1,
        success: true,
      });
    }
    return result;
  }),
}));

vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(async (items) => {
    if (items.includes('FAIL')) throw new Error('fail');
    return items.map((i) => `${i}-x`);
  }),
  ListStyle: { NEWLINE: 'newline', XML: 'xml', AUTO: 'auto' },
  determineStyle: vi.fn(() => 'newline'),
}));

beforeEach(() => vi.clearAllMocks());

// ─── map (batched) ────────────────────────────────────────────────────────

const mapExamples = [
  {
    name: 'maps fragments in batches',
    inputs: { list: ['a', 'b', 'c'], options: { batchSize: 2 } },
    check: all(equals(['a-x', 'b-x', 'c-x']), () => expect(listBatch).toHaveBeenCalledTimes(2)),
  },
  {
    name: 'throws when all items fail',
    inputs: {
      list: ['FAIL', 'oops'],
      options: { batchSize: 2 },
      preMock: () => listBatch.mockRejectedValueOnce(new Error('fail')),
    },
    check: throws(/all 2 items failed/),
  },
  {
    name: 'caps oversized LLM output to prevent overflow into adjacent batches',
    inputs: {
      list: ['a', 'b', 'c', 'd'],
      options: { batchSize: 2 },
      preMock: () => {
        let call = 0;
        listBatch.mockImplementation(async (items) => {
          call += 1;
          if (call === 1) return ['a-x', 'b-x', 'OVERFLOW-1', 'OVERFLOW-2'];
          return items.map((i) => `${i}-x`);
        });
      },
    },
    check: equals(['a-x', 'b-x', 'c-x', 'd-x']),
  },
  {
    name: 'handles undersized LLM output by retrying missing items',
    inputs: {
      list: ['a', 'b', 'c', 'd'],
      options: { batchSize: 2, maxAttempts: 2 },
      preMock: () => {
        let call = 0;
        listBatch.mockImplementation(async (items) => {
          call += 1;
          if (call === 1) return ['a-x'];
          return items.map((i) => `${i}-x`);
        });
      },
    },
    check: equals(['a-x', 'b-x', 'c-x', 'd-x']),
  },
  {
    name: 'retries only failed fragments',
    inputs: {
      list: ['alpha', 'beta'],
      instructions: 'upper',
      options: { batchSize: 2, maxAttempts: 2 },
      preMock: () => {
        let call = 0;
        listBatch.mockImplementation(async (items) => {
          call += 1;
          if (call === 1) throw new Error('fail');
          return items.map((l) => l.toUpperCase());
        });
      },
    },
    check: all(equals(['ALPHA', 'BETA']), () => expect(listBatch).toHaveBeenCalledTimes(2)),
  },
  {
    name: 'retries multiple times',
    inputs: {
      list: ['alpha', 'beta'],
      instructions: 'upper',
      options: { batchSize: 2, maxAttempts: 3 },
      preMock: () => {
        let call = 0;
        listBatch.mockImplementation(async (items) => {
          call += 1;
          if (call <= 2) throw new Error('fail');
          return items.map((l) => l.toUpperCase());
        });
      },
    },
    check: all(equals(['ALPHA', 'BETA']), () => expect(listBatch).toHaveBeenCalledTimes(3)),
  },
];

runTable({
  describe: 'map',
  examples: mapExamples,
  process: async ({ list, instructions, options, preMock }) => {
    if (preMock) preMock();
    return map(list, instructions ?? 'x', options);
  },
});

// ─── progress callbacks ──────────────────────────────────────────────────

runTable({
  describe: 'map — progress callbacks',
  examples: [
    {
      name: 'emits progress events during batch processing',
      inputs: { list: ['a', 'b', 'c', 'd'], options: { batchSize: 2 } },
      check: ({ result }) => {
        const start = result.events.find((e) => e.step === 'map' && e.event === ChainEvent.start);
        expect(start).toBeDefined();
        const complete = result.events.find(
          (e) => e.step === 'map' && e.event === ChainEvent.complete
        );
        expect(complete).toMatchObject({ totalItems: 4, successCount: 4 });
      },
    },
    {
      name: 'includes retry events in progress',
      inputs: { list: ['a', 'b'], options: { batchSize: 2 } },
      check: ({ result }) => {
        const retryStart = result.events.filter(
          (e) => e.step === 'map:batch' && e.event === 'start'
        );
        expect(retryStart.length).toBeGreaterThan(0);
        const retryComplete = result.events.filter(
          (e) => e.step === 'map:batch' && e.event === 'complete'
        );
        expect(retryComplete.length).toBeGreaterThan(0);
      },
    },
    {
      name: 'tracks processed items correctly',
      inputs: { list: ['a', 'b', 'c', 'd', 'e'], options: { batchSize: 2 } },
      check: ({ result }) => {
        const complete = result.events.find(
          (e) => e.step === 'map' && e.event === ChainEvent.complete
        );
        expect(complete.totalItems).toBe(5);
        expect(complete.successCount).toBeLessThanOrEqual(5);
      },
    },
    {
      name: 'includes result metadata in complete event',
      inputs: { list: ['a', 'b', 'c'], options: { batchSize: 2 } },
      check: ({ result }) => {
        const complete = result.events.find(
          (e) => e.step === 'map' && e.event === ChainEvent.complete
        );
        expect(complete.totalItems).toBe(3);
        expect(complete.outcome).toBeDefined();
        expect(complete.successCount).toBeDefined();
        expect(complete.failedItems).toBeDefined();
      },
    },
  ],
  process: async ({ list, options }) => {
    const events = [];
    await map(list, 'transform', { ...options, onProgress: (e) => events.push(e) });
    return { events };
  },
});

// ─── incremental batch progress ──────────────────────────────────────────

runTable({
  describe: 'map — incremental batch progress',
  examples: [
    {
      name: 'emits batch:complete events as each batch finishes',
      inputs: { list: ['a', 'b', 'c', 'd', 'e'], options: { batchSize: 2 } },
      check: ({ result }) => {
        const batches = result.events.filter(
          (e) => e.step === 'map' && e.event === OpEvent.batchComplete
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
          (e) => e.step === 'map' && e.event === OpEvent.batchComplete
        );
        expect(batches).toHaveLength(2);
        expect(batches[0].progress).toBeCloseTo(0.5);
        expect(batches[1].progress).toBeCloseTo(1.0);
      },
    },
    {
      name: 'emits batch progress even when some batches fail',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        options: { batchSize: 2, maxAttempts: 1 },
        preMock: () => {
          let call = 0;
          listBatch.mockImplementation(async (items) => {
            call += 1;
            if (call === 1) throw new Error('first batch fails');
            return items.map((i) => `${i}-x`);
          });
        },
      },
      check: ({ result }) => {
        expect(result.value[0]).toBeUndefined();
        expect(result.value[1]).toBeUndefined();
        expect(result.value[2]).toBe('c-x');
        expect(result.value[3]).toBe('d-x');
        const complete = result.events.find(
          (e) => e.step === 'map' && e.event === ChainEvent.complete
        );
        expect(complete).toMatchObject({
          outcome: 'partial',
          failedItems: 2,
          successCount: 2,
        });
      },
    },
  ],
  process: async ({ list, options, preMock }) => {
    if (preMock) preMock();
    const events = [];
    const value = await map(list, 'transform', {
      ...options,
      onProgress: (e) => events.push(e),
    });
    return { value, events };
  },
});

// ─── streamingMap ────────────────────────────────────────────────────────

runTable({
  describe: 'streamingMap',
  examples: [
    {
      name: 'yields cumulative results after each batch',
      inputs: { list: ['a', 'b', 'c', 'd'], options: { batchSize: 2 } },
      check: ({ result }) => {
        const { yields } = result;
        expect(yields).toHaveLength(2);
        expect(yields[0]).toMatchObject({
          0: 'a-x',
          1: 'b-x',
          2: undefined,
          3: undefined,
        });
        expect(yields[1]).toEqual(['a-x', 'b-x', 'c-x', 'd-x']);
      },
    },
    {
      name: 'emits partial domain events matching each yield',
      inputs: { list: ['a', 'b', 'c', 'd', 'e'], options: { batchSize: 2 } },
      check: ({ result }) => {
        const partials = result.events.filter(
          (e) => e.step === 'streaming-map' && e.event === DomainEvent.partial
        );
        expect(partials).toHaveLength(result.yields.length);
        expect(partials[0].value[0]).toBe('a-x');
        expect(partials[0].value[2]).toBeUndefined();
        expect(partials[1].value[2]).toBe('c-x');
      },
    },
    {
      name: 'emits batch:complete events incrementally',
      inputs: { list: ['a', 'b', 'c'], options: { batchSize: 2 } },
      check: ({ result }) => {
        expect(result.yields.length).toBeGreaterThan(0);
        const batches = result.events.filter(
          (e) => e.step === 'streaming-map' && e.event === OpEvent.batchComplete
        );
        expect(batches).toHaveLength(2);
        expect(batches[0]).toMatchObject({ processedItems: 2, totalItems: 3 });
        expect(batches[1].processedItems).toBe(3);
      },
    },
    {
      name: 'caps oversized LLM output to prevent overflow into adjacent batches',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        options: { batchSize: 2 },
        preMock: () =>
          listBatch.mockImplementation(async (items) => [
            ...items.map((i) => `${i}-x`),
            'OVERFLOW-1',
            'OVERFLOW-2',
          ]),
      },
      check: ({ result }) => {
        expect(result.yields).toHaveLength(2);
        expect(result.yields[1]).toStrictEqual(['a-x', 'b-x', 'c-x', 'd-x']);
      },
    },
    {
      name: 'marks failed batch items as undefined in cumulative yields',
      inputs: {
        list: ['a', 'b', 'c', 'd', 'e', 'f'],
        options: { batchSize: 2 },
        preMock: () => {
          let call = 0;
          listBatch.mockImplementation(async (items) => {
            call += 1;
            if (call === 2) throw new Error('second batch fails');
            return items.map((i) => `${i}-x`);
          });
        },
      },
      check: ({ result }) => {
        const { yields } = result;
        expect(yields).toHaveLength(3);
        expect(yields[0][0]).toBe('a-x');
        expect(yields[0][1]).toBe('b-x');
        expect(yields[0][2]).toBeUndefined();
        expect(yields[1][2]).toBeUndefined();
        expect(yields[1][3]).toBeUndefined();
        expect(yields[2][4]).toBe('e-x');
        expect(yields[2][5]).toBe('f-x');
        expect(yields[2][2]).toBeUndefined();
        expect(yields[2][3]).toBeUndefined();
      },
    },
    {
      name: 'emits full lifecycle: start → partial → output → complete',
      inputs: { list: ['a', 'b'], options: { batchSize: 2 } },
      check: ({ result }) => {
        const stepEvents = result.events.filter((e) => e.step === 'streaming-map');
        const names = stepEvents.map((e) => e.event);
        expect(names[0]).toBe(ChainEvent.start);
        expect(names).toContain(DomainEvent.input);
        expect(names).toContain(DomainEvent.partial);
        expect(names).toContain(DomainEvent.output);
        expect(names[names.length - 1]).toBe(ChainEvent.complete);
      },
    },
    {
      name: 'complete event reports batch and item counts',
      inputs: { list: ['a', 'b', 'c'], options: { batchSize: 2 } },
      check: ({ result }) => {
        const complete = result.events.find(
          (e) => e.step === 'streaming-map' && e.event === ChainEvent.complete
        );
        expect(complete).toMatchObject({
          totalItems: 3,
          totalBatches: 2,
          successCount: 3,
          failedItems: 0,
          outcome: 'success',
        });
      },
    },
  ],
  process: async ({ list, options, preMock }) => {
    if (preMock) preMock();
    const events = [];
    const yields = [];
    for await (const partial of streamingMap(list, 'transform', {
      ...options,
      onProgress: (e) => events.push(e),
    })) {
      yields.push(partial);
    }
    return { yields, events };
  },
});

// ─── mapItem ─────────────────────────────────────────────────────────────

runTable({
  describe: 'mapItem',
  examples: [
    {
      name: 'transforms a single item via one LLM call',
      inputs: {
        item: 'hello',
        instructions: 'uppercase',
        preMock: () => vi.mocked(callLlm).mockResolvedValueOnce('SHOUTED'),
      },
      check: all(equals('SHOUTED'), () => {
        expect(callLlm).toHaveBeenCalledTimes(1);
        expect(callLlm).toHaveBeenCalledWith(
          expect.stringContaining('<transformation-instructions>'),
          expect.any(Object)
        );
      }),
    },
    {
      name: 'serializes object items into the prompt',
      inputs: {
        item: { a: 1 },
        instructions: 'transform',
        preMock: () => vi.mocked(callLlm).mockResolvedValueOnce('result'),
      },
      check: () => {
        const prompt = vi.mocked(callLlm).mock.calls[0][0];
        expect(prompt).toContain('"a":1');
      },
    },
    {
      name: 'threads custom responseFormat through to callLlm',
      inputs: {
        item: 'item',
        instructions: 'instructions',
        options: {
          responseFormat: { type: 'json_schema', json_schema: { name: 'x', schema: {} } },
        },
        preMock: () => vi.mocked(callLlm).mockResolvedValueOnce({ shape: 'object' }),
      },
      check: ({ inputs }) => {
        const cfg = vi.mocked(callLlm).mock.calls[0][1];
        expect(cfg.responseFormat).toBe(inputs.options.responseFormat);
      },
    },
  ],
  process: async ({ item, instructions, options, preMock }) => {
    if (preMock) preMock();
    return mapItem(item, instructions, options);
  },
});

// ─── mapParallel ─────────────────────────────────────────────────────────

runTable({
  describe: 'mapParallel',
  examples: [
    {
      name: 'runs one LLM call per item and aligns results',
      inputs: {
        list: ['a', 'b', 'c'],
        instructions: 'uppercase',
        options: { maxParallel: 3 },
        preMock: () =>
          vi
            .mocked(callLlm)
            .mockResolvedValueOnce('A')
            .mockResolvedValueOnce('B')
            .mockResolvedValueOnce('C'),
      },
      check: all(equals(['A', 'B', 'C']), () => expect(callLlm).toHaveBeenCalledTimes(3)),
    },
    {
      name: 'reports partial outcome when one slot fails after retries',
      inputs: {
        list: ['a', 'b', 'c'],
        instructions: 'transform',
        options: { maxParallel: 1, maxAttempts: 1 },
        withEvents: true,
        preMock: () =>
          vi
            .mocked(callLlm)
            .mockResolvedValueOnce('A')
            .mockRejectedValueOnce(new Error('boom'))
            .mockResolvedValueOnce('C'),
      },
      check: ({ result }) => {
        expect(result.value[0]).toBe('A');
        expect(result.value[1]).toBeUndefined();
        expect(result.value[2]).toBe('C');
        const complete = result.events.find(
          (e) => e.event === 'chain:complete' && e.step === 'map:parallel'
        );
        expect(complete).toMatchObject({ outcome: 'partial', failedItems: 1 });
      },
    },
    {
      name: 'throws when list is not an array',
      inputs: { list: 'not-an-array', instructions: 'x' },
      check: throws(/must be an array/),
    },
  ],
  process: async ({ list, instructions, options, preMock, withEvents }) => {
    if (preMock) preMock();
    if (withEvents) {
      const events = [];
      const value = await mapParallel(list, instructions, {
        ...options,
        onProgress: (e) => events.push(e),
      });
      return { value, events };
    }
    return mapParallel(list, instructions, options);
  },
});
