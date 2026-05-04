import { beforeEach, vi, expect } from 'vitest';
import map, { streamingMap, mapItem, mapParallel } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import callLlm from '../../lib/llm/index.js';
import { OpEvent, ChainEvent, DomainEvent } from '../../lib/progress/constants.js';
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

runTable({
  describe: 'map',
  examples: [
    {
      name: 'maps fragments in batches',
      inputs: { list: ['a', 'b', 'c'], options: { batchSize: 2 } },
      want: { value: ['a-x', 'b-x', 'c-x'], batchCalls: 2 },
    },
    {
      name: 'throws when all items fail',
      inputs: {
        list: ['FAIL', 'oops'],
        options: { batchSize: 2 },
        setupMock: () => listBatch.mockRejectedValueOnce(new Error('fail')),
      },
      want: { throws: /all 2 items failed/ },
    },
    {
      name: 'caps oversized LLM output to prevent overflow into adjacent batches',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        options: { batchSize: 2 },
        setupMock: () => {
          let call = 0;
          listBatch.mockImplementation(async (items) => {
            call += 1;
            if (call === 1) return ['a-x', 'b-x', 'OVERFLOW-1', 'OVERFLOW-2'];
            return items.map((i) => `${i}-x`);
          });
        },
      },
      want: { value: ['a-x', 'b-x', 'c-x', 'd-x'] },
    },
    {
      name: 'handles undersized LLM output by retrying missing items',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        options: { batchSize: 2, maxAttempts: 2 },
        setupMock: () => {
          let call = 0;
          listBatch.mockImplementation(async (items) => {
            call += 1;
            if (call === 1) return ['a-x'];
            return items.map((i) => `${i}-x`);
          });
        },
      },
      want: { value: ['a-x', 'b-x', 'c-x', 'd-x'] },
    },
    {
      name: 'retries only failed fragments',
      inputs: {
        list: ['alpha', 'beta'],
        instructions: 'upper',
        options: { batchSize: 2, maxAttempts: 2 },
        setupMock: () => {
          let call = 0;
          listBatch.mockImplementation(async (items) => {
            call += 1;
            if (call === 1) throw new Error('fail');
            return items.map((l) => l.toUpperCase());
          });
        },
      },
      want: { value: ['ALPHA', 'BETA'], batchCalls: 2 },
    },
    {
      name: 'retries multiple times',
      inputs: {
        list: ['alpha', 'beta'],
        instructions: 'upper',
        options: { batchSize: 2, maxAttempts: 3 },
        setupMock: () => {
          let call = 0;
          listBatch.mockImplementation(async (items) => {
            call += 1;
            if (call <= 2) throw new Error('fail');
            return items.map((l) => l.toUpperCase());
          });
        },
      },
      want: { value: ['ALPHA', 'BETA'], batchCalls: 3 },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    return map(inputs.list, inputs.instructions ?? 'x', inputs.options);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('value' in want) expect(result).toEqual(want.value);
    if ('batchCalls' in want) expect(listBatch).toHaveBeenCalledTimes(want.batchCalls);
  },
});

runTable({
  describe: 'map — progress callbacks',
  examples: [
    {
      name: 'emits progress events during batch processing',
      inputs: { list: ['a', 'b', 'c', 'd'], options: { batchSize: 2 } },
      want: { startAndComplete: { totalItems: 4, successCount: 4 } },
    },
    {
      name: 'includes retry events in progress',
      inputs: { list: ['a', 'b'], options: { batchSize: 2 } },
      want: { hasRetryEvents: true },
    },
    {
      name: 'tracks processed items correctly',
      inputs: { list: ['a', 'b', 'c', 'd', 'e'], options: { batchSize: 2 } },
      want: { totalItems: 5, successCountAtMost: 5 },
    },
    {
      name: 'includes result metadata in complete event',
      inputs: { list: ['a', 'b', 'c'], options: { batchSize: 2 } },
      want: { completeMetadata: 3 },
    },
  ],
  process: async ({ inputs }) => {
    const events = [];
    await map(inputs.list, 'transform', { ...inputs.options, onProgress: (e) => events.push(e) });
    return { events };
  },
  expects: ({ result, want }) => {
    if (want.startAndComplete) {
      const start = result.events.find((e) => e.step === 'map' && e.event === ChainEvent.start);
      expect(start).toBeDefined();
      const complete = result.events.find(
        (e) => e.step === 'map' && e.event === ChainEvent.complete
      );
      expect(complete).toMatchObject(want.startAndComplete);
    }
    if (want.hasRetryEvents) {
      const retryStart = result.events.filter((e) => e.step === 'map:batch' && e.event === 'start');
      expect(retryStart.length).toBeGreaterThan(0);
      const retryComplete = result.events.filter(
        (e) => e.step === 'map:batch' && e.event === 'complete'
      );
      expect(retryComplete.length).toBeGreaterThan(0);
    }
    if ('totalItems' in want) {
      const complete = result.events.find(
        (e) => e.step === 'map' && e.event === ChainEvent.complete
      );
      expect(complete.totalItems).toBe(want.totalItems);
      if ('successCountAtMost' in want) {
        expect(complete.successCount).toBeLessThanOrEqual(want.successCountAtMost);
      }
    }
    if (want.completeMetadata) {
      const complete = result.events.find(
        (e) => e.step === 'map' && e.event === ChainEvent.complete
      );
      expect(complete.totalItems).toBe(want.completeMetadata);
      expect(complete.outcome).toBeDefined();
      expect(complete.successCount).toBeDefined();
      expect(complete.failedItems).toBeDefined();
    }
  },
});

runTable({
  describe: 'map — incremental batch progress',
  examples: [
    {
      name: 'emits batch:complete events as each batch finishes',
      inputs: { list: ['a', 'b', 'c', 'd', 'e'], options: { batchSize: 2 } },
      want: {
        batchProgressions: [
          { processedItems: 2, totalItems: 5 },
          { idx: 1, processedItems: 4 },
          { idx: 2, processedItems: 5 },
        ],
        batchCount: 3,
      },
    },
    {
      name: 'reports progress ratio on each batch event',
      inputs: { list: ['a', 'b', 'c', 'd'], options: { batchSize: 2 } },
      want: { batchRatios: [0.5, 1.0] },
    },
    {
      name: 'emits batch progress even when some batches fail',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        options: { batchSize: 2, maxAttempts: 1 },
        setupMock: () => {
          let call = 0;
          listBatch.mockImplementation(async (items) => {
            call += 1;
            if (call === 1) throw new Error('first batch fails');
            return items.map((i) => `${i}-x`);
          });
        },
      },
      want: {
        firstBatchFailed: true,
        complete: { outcome: 'partial', failedItems: 2, successCount: 2 },
      },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    const events = [];
    const value = await map(inputs.list, 'transform', {
      ...inputs.options,
      onProgress: (e) => events.push(e),
    });
    return { value, events };
  },
  expects: ({ result, want }) => {
    const batches = result.events.filter(
      (e) => e.step === 'map' && e.event === OpEvent.batchComplete
    );
    if (want.batchCount) expect(batches).toHaveLength(want.batchCount);
    if (want.batchProgressions) {
      expect(batches[0]).toMatchObject({ processedItems: 2, totalItems: 5 });
      expect(batches[1].processedItems).toBe(4);
      expect(batches[2].processedItems).toBe(5);
    }
    if (want.batchRatios) {
      expect(batches).toHaveLength(want.batchRatios.length);
      want.batchRatios.forEach((ratio, i) => {
        expect(batches[i].progress).toBeCloseTo(ratio);
      });
    }
    if (want.firstBatchFailed) {
      expect(result.value[0]).toBeUndefined();
      expect(result.value[1]).toBeUndefined();
      expect(result.value[2]).toBe('c-x');
      expect(result.value[3]).toBe('d-x');
    }
    if (want.complete) {
      const complete = result.events.find(
        (e) => e.step === 'map' && e.event === ChainEvent.complete
      );
      expect(complete).toMatchObject(want.complete);
    }
  },
});

runTable({
  describe: 'streamingMap',
  examples: [
    {
      name: 'yields cumulative results after each batch',
      inputs: { list: ['a', 'b', 'c', 'd'], options: { batchSize: 2 } },
      want: { yieldsBasic: true },
    },
    {
      name: 'emits partial domain events matching each yield',
      inputs: { list: ['a', 'b', 'c', 'd', 'e'], options: { batchSize: 2 } },
      want: { partials: true },
    },
    {
      name: 'emits batch:complete events incrementally',
      inputs: { list: ['a', 'b', 'c'], options: { batchSize: 2 } },
      want: { batchesIncremental: true },
    },
    {
      name: 'caps oversized LLM output to prevent overflow into adjacent batches',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        options: { batchSize: 2 },
        setupMock: () =>
          listBatch.mockImplementation(async (items) => [
            ...items.map((i) => `${i}-x`),
            'OVERFLOW-1',
            'OVERFLOW-2',
          ]),
      },
      want: { yieldsCapped: true },
    },
    {
      name: 'marks failed batch items as undefined in cumulative yields',
      inputs: {
        list: ['a', 'b', 'c', 'd', 'e', 'f'],
        options: { batchSize: 2 },
        setupMock: () => {
          let call = 0;
          listBatch.mockImplementation(async (items) => {
            call += 1;
            if (call === 2) throw new Error('second batch fails');
            return items.map((i) => `${i}-x`);
          });
        },
      },
      want: { failedYields: true },
    },
    {
      name: 'emits full lifecycle: start → partial → output → complete',
      inputs: { list: ['a', 'b'], options: { batchSize: 2 } },
      want: { lifecycle: true },
    },
    {
      name: 'complete event reports batch and item counts',
      inputs: { list: ['a', 'b', 'c'], options: { batchSize: 2 } },
      want: {
        complete: {
          totalItems: 3,
          totalBatches: 2,
          successCount: 3,
          failedItems: 0,
          outcome: 'success',
        },
      },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    const events = [];
    const yields = [];
    for await (const partial of streamingMap(inputs.list, 'transform', {
      ...inputs.options,
      onProgress: (e) => events.push(e),
    })) {
      yields.push(partial);
    }
    return { yields, events };
  },
  expects: ({ result, want }) => {
    if (want.yieldsBasic) {
      const { yields } = result;
      expect(yields).toHaveLength(2);
      expect(yields[0]).toMatchObject({
        0: 'a-x',
        1: 'b-x',
        2: undefined,
        3: undefined,
      });
      expect(yields[1]).toEqual(['a-x', 'b-x', 'c-x', 'd-x']);
    }
    if (want.partials) {
      const partials = result.events.filter(
        (e) => e.step === 'streaming-map' && e.event === DomainEvent.partial
      );
      expect(partials).toHaveLength(result.yields.length);
      expect(partials[0].value[0]).toBe('a-x');
      expect(partials[0].value[2]).toBeUndefined();
      expect(partials[1].value[2]).toBe('c-x');
    }
    if (want.batchesIncremental) {
      expect(result.yields.length).toBeGreaterThan(0);
      const batches = result.events.filter(
        (e) => e.step === 'streaming-map' && e.event === OpEvent.batchComplete
      );
      expect(batches).toHaveLength(2);
      expect(batches[0]).toMatchObject({ processedItems: 2, totalItems: 3 });
      expect(batches[1].processedItems).toBe(3);
    }
    if (want.yieldsCapped) {
      expect(result.yields).toHaveLength(2);
      expect(result.yields[1]).toStrictEqual(['a-x', 'b-x', 'c-x', 'd-x']);
    }
    if (want.failedYields) {
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
    }
    if (want.lifecycle) {
      const stepEvents = result.events.filter((e) => e.step === 'streaming-map');
      const names = stepEvents.map((e) => e.event);
      expect(names[0]).toBe(ChainEvent.start);
      expect(names).toContain(DomainEvent.input);
      expect(names).toContain(DomainEvent.partial);
      expect(names).toContain(DomainEvent.output);
      expect(names[names.length - 1]).toBe(ChainEvent.complete);
    }
    if (want.complete) {
      const complete = result.events.find(
        (e) => e.step === 'streaming-map' && e.event === ChainEvent.complete
      );
      expect(complete).toMatchObject(want.complete);
    }
  },
});

runTable({
  describe: 'mapItem',
  examples: [
    {
      name: 'transforms a single item via one LLM call',
      inputs: { item: 'hello', instructions: 'uppercase' },
      mocks: { callLlm: ['SHOUTED'] },
      want: { value: 'SHOUTED', llmCalls: 1, promptContains: '<transformation-instructions>' },
    },
    {
      name: 'serializes object items into the prompt',
      inputs: { item: { a: 1 }, instructions: 'transform' },
      mocks: { callLlm: ['result'] },
      want: { promptContains: '"a":1' },
    },
    {
      name: 'threads custom responseFormat through to callLlm',
      inputs: {
        item: 'item',
        instructions: 'instructions',
        options: {
          responseFormat: { type: 'json_schema', json_schema: { name: 'x', schema: {} } },
        },
      },
      mocks: { callLlm: [{ shape: 'object' }] },
      want: { responseFormatPassed: true },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { callLlm });
    return mapItem(inputs.item, inputs.instructions, inputs.options);
  },
  expects: ({ result, inputs, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    if ('llmCalls' in want) expect(callLlm).toHaveBeenCalledTimes(want.llmCalls);
    if (want.promptContains) {
      const prompt = vi.mocked(callLlm).mock.calls[0][0];
      expect(prompt).toContain(want.promptContains);
    }
    if (want.responseFormatPassed) {
      const cfg = vi.mocked(callLlm).mock.calls[0][1];
      expect(cfg.responseFormat).toBe(inputs.options.responseFormat);
    }
  },
});

runTable({
  describe: 'mapParallel',
  examples: [
    {
      name: 'runs one LLM call per item and aligns results',
      inputs: { list: ['a', 'b', 'c'], instructions: 'uppercase', options: { maxParallel: 3 } },
      mocks: { callLlm: ['A', 'B', 'C'] },
      want: { value: ['A', 'B', 'C'], llmCalls: 3 },
    },
    {
      name: 'reports partial outcome when one slot fails after retries',
      inputs: {
        list: ['a', 'b', 'c'],
        instructions: 'transform',
        options: { maxParallel: 1, maxAttempts: 1 },
        withEvents: true,
      },
      mocks: { callLlm: ['A', new Error('boom'), 'C'] },
      want: { partial: true },
    },
    {
      name: 'throws when list is not an array',
      inputs: { list: 'not-an-array', instructions: 'x' },
      want: { throws: /must be an array/ },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { callLlm });
    if (inputs.withEvents) {
      const events = [];
      const value = await mapParallel(inputs.list, inputs.instructions, {
        ...inputs.options,
        onProgress: (e) => events.push(e),
      });
      return { value, events };
    }
    return mapParallel(inputs.list, inputs.instructions, inputs.options);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('value' in want) expect(result).toEqual(want.value);
    if ('llmCalls' in want) expect(callLlm).toHaveBeenCalledTimes(want.llmCalls);
    if (want.partial) {
      expect(result.value[0]).toBe('A');
      expect(result.value[1]).toBeUndefined();
      expect(result.value[2]).toBe('C');
      const complete = result.events.find(
        (e) => e.event === 'chain:complete' && e.step === 'map:parallel'
      );
      expect(complete).toMatchObject({ outcome: 'partial', failedItems: 1 });
    }
  },
});
