import { beforeEach, expect, vi } from 'vitest';
import { testPromptShapingOption } from '../../lib/test-utils/index.js';
import filter, { filterParallel } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import bool from '../../verblets/bool/index.js';
import { ChainEvent, DomainEvent, OpEvent } from '../../lib/progress/constants.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

vi.mock('../../verblets/bool/index.js', () => ({ default: vi.fn() }));

vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(async (items) => {
    if (items.includes('FAIL')) throw new Error('fail');
    return items.map((item) => (item.includes('a') ? 'yes' : 'no'));
  }),
  ListStyle: { AUTO: 'auto', XML: 'xml', NEWLINE: 'newline' },
  determineStyle: vi.fn(() => 'newline'),
}));

vi.mock('../../lib/text-batch/index.js', () => ({
  default: vi.fn((items, config) => {
    const batchSize = config?.batchSize || 10;
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push({ items: items.slice(i, i + batchSize), startIndex: i });
    }
    return batches;
  }),
}));

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => {
    try {
      return await fn();
    } catch {
      return await fn();
    }
  }),
}));

beforeEach(() => vi.clearAllMocks());

runTable({
  describe: 'filter',
  examples: [
    {
      name: 'filters items in batches',
      inputs: { list: ['a', 'b', 'c'], instructions: 'a', options: { batchSize: 2 } },
      want: { value: ['a'], batchCalls: 2 },
    },
    {
      name: 'throws on undersized LLM response in strict mode (default)',
      inputs: {
        list: ['apple', 'banana', 'box'],
        instructions: 'contains a',
        options: { batchSize: 10 },
        setupMock: () =>
          listBatch.mockImplementation(async (items) =>
            items.slice(0, 1).map((item) => (item.includes('a') ? 'yes' : 'no'))
          ),
      },
      want: { throws: /decisions for/ },
    },
    {
      name: 'throws on oversized LLM response in strict mode (default)',
      inputs: {
        list: ['apple', 'banana'],
        instructions: 'include all',
        options: { batchSize: 10 },
        setupMock: () =>
          listBatch.mockImplementation(async (items) => [...items.map(() => 'yes'), 'yes', 'yes']),
      },
      want: { throws: /decisions for/ },
    },
    {
      name: 'size-mismatch surfaces outcome=partial in resilient mode',
      inputs: {
        list: ['apple', 'banana', 'box'],
        instructions: 'contains a',
        options: { batchSize: 10, strictness: 'low' },
        withEvents: true,
        setupMock: () =>
          listBatch.mockImplementation(async (items) =>
            items.slice(0, 1).map((item) => (item.includes('a') ? 'yes' : 'no'))
          ),
      },
      want: { outcome: 'partial' },
    },
    {
      name: 'advances batch progress on resilient failure',
      inputs: {
        list: ['a', 'b'],
        instructions: 'x',
        options: { batchSize: 10, strictness: 'low' },
        withEvents: true,
        setupMock: () => listBatch.mockRejectedValue(new Error('fail')),
      },
      want: { batchEventsAtLeast: 1 },
    },
    {
      name: 'retries failed batches',
      inputs: {
        list: ['FAIL', 'a', 'b'],
        instructions: 'a',
        options: { batchSize: 2, maxAttempts: 2 },
        setupMock: () => {
          let call = 0;
          listBatch.mockImplementation(async (items) => {
            call += 1;
            if (call === 1) throw new Error('fail');
            return items.map((item) => (item.includes('a') ? 'yes' : 'no'));
          });
        },
      },
      want: { value: ['a'], batchCalls: 3 },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    if (inputs.withEvents) {
      const events = [];
      const value = await filter(inputs.list, inputs.instructions, {
        ...inputs.options,
        onProgress: (e) => events.push(e),
      });
      return { value, events };
    }
    return filter(inputs.list, inputs.instructions, inputs.options);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('value' in want) expect(result).toEqual(want.value);
    if ('batchCalls' in want) {
      expect(listBatch).toHaveBeenCalledTimes(want.batchCalls);
    }
    if (want.outcome) {
      const complete = result.events.find(
        (e) => e.step === 'filter' && e.event === 'chain:complete'
      );
      expect(complete.outcome).toBe(want.outcome);
    }
    if (want.batchEventsAtLeast) {
      const batches = result.events.filter((e) => e.event === 'batch:complete');
      expect(batches.length).toBeGreaterThanOrEqual(want.batchEventsAtLeast);
    }
  },
});

testPromptShapingOption('strictness', {
  invoke: (config) => filter(['apple', 'box'], 'contains a', { batchSize: 10, ...config }),
  setupMocks: () => {},
  llmMock: listBatch,
  markers: { low: 'err on the side of inclusion', high: 'err on the side of exclusion' },
  promptArgIndex: 1,
});

runTable({
  describe: 'filter — progress emission',
  examples: [
    {
      name: 'emits full lifecycle: start, input, batch progress, output, complete',
      inputs: { list: ['apple', 'banana', 'box'], options: { batchSize: 10 } },
      want: { fullLifecycle: true },
    },
    {
      name: 'emits events in correct lifecycle order',
      inputs: { list: ['apple', 'box'], options: { batchSize: 10 } },
      want: { orderedEvents: true },
    },
    {
      name: 'tracks batch progress across multiple batches',
      inputs: {
        list: ['apple', 'banana', 'box', 'avocado', 'cherry'],
        options: { batchSize: 2 },
      },
      want: { minBatches: 2, lastProcessed: 5 },
    },
    {
      name: 'events carry operation path and timestamp',
      inputs: { list: ['apple'], options: { batchSize: 10 } },
      want: { traceContext: true },
    },
  ],
  process: async ({ inputs }) => {
    const events = [];
    const value = await filter(inputs.list, 'contains a', {
      ...inputs.options,
      onProgress: (e) => events.push(e),
    });
    return { value, events };
  },
  expects: ({ result, inputs, want }) => {
    if (want.fullLifecycle) {
      const { events, value } = result;
      const start = events.find((e) => e.step === 'filter' && e.event === ChainEvent.start);
      expect(start.kind).toBe('telemetry');
      const input = events.find((e) => e.step === 'filter' && e.event === DomainEvent.input);
      expect(input).toMatchObject({ kind: 'event', value: inputs.list });
      const opStart = events.find(
        (e) => e.step === 'filter' && e.event === OpEvent.start && e.kind === 'operation'
      );
      expect(opStart).toMatchObject({ totalItems: inputs.list.length, totalBatches: 1 });
      const batchComplete = events.find(
        (e) => e.step === 'filter' && e.event === OpEvent.batchComplete
      );
      expect(batchComplete).toMatchObject({
        kind: 'operation',
        processedItems: inputs.list.length,
      });
      expect(
        events.find(
          (e) => e.step === 'filter' && e.event === OpEvent.complete && e.kind === 'operation'
        )
      ).toBeDefined();
      const output = events.find((e) => e.step === 'filter' && e.event === DomainEvent.output);
      expect(output).toMatchObject({ kind: 'event', value });
      const complete = events.find((e) => e.step === 'filter' && e.event === ChainEvent.complete);
      expect(complete).toMatchObject({
        kind: 'telemetry',
        inputCount: inputs.list.length,
        outputCount: value.length,
        outcome: 'success',
      });
    }
    if (want.orderedEvents) {
      const names = result.events.map((e) => e.event);
      const order = [
        names.indexOf(ChainEvent.start),
        names.indexOf(DomainEvent.input),
        names.indexOf(OpEvent.start),
        names.indexOf(OpEvent.complete),
        names.indexOf(DomainEvent.output),
        names.indexOf(ChainEvent.complete),
      ];
      for (let i = 1; i < order.length; i++) {
        expect(order[i - 1]).toBeLessThan(order[i]);
      }
    }
    if (want.minBatches) {
      const batches = result.events.filter((e) => e.event === OpEvent.batchComplete);
      expect(batches.length).toBeGreaterThanOrEqual(want.minBatches);
      expect(batches[batches.length - 1].processedItems).toBe(want.lastProcessed);
    }
    if (want.traceContext) {
      const start = result.events.find((e) => e.step === 'filter' && e.event === ChainEvent.start);
      expect(start.operation).toBeDefined();
      expect(start.timestamp).toBeDefined();
    }
  },
});

runTable({
  describe: 'filter — eventFilter',
  examples: [
    {
      name: 'respects eventFilter to receive only operation events',
      inputs: { mode: 'operation' },
      want: { mode: 'operation' },
    },
    {
      name: 'respects eventFilter with kind string shorthand',
      inputs: { mode: 'event-shorthand' },
      want: { mode: 'event-shorthand' },
    },
  ],
  process: async ({ inputs }) => {
    if (inputs.mode === 'operation') {
      const allEvents = [];
      const filtered = [];
      await filter(['apple', 'box'], 'contains a', {
        batchSize: 10,
        onProgress: (e) => allEvents.push(e),
      });
      await filter(['apple', 'box'], 'contains a', {
        batchSize: 10,
        onProgress: (e) => filtered.push(e),
        eventFilter: (e) => e.kind === 'operation',
      });
      return { allEvents, filtered };
    }
    const events = [];
    await filter(['apple', 'box'], 'contains a', {
      batchSize: 10,
      onProgress: (e) => events.push(e),
      eventFilter: 'event',
    });
    return { events };
  },
  expects: ({ result, want }) => {
    if (want.mode === 'operation') {
      expect(result.allEvents.filter((e) => e.kind !== 'operation').length).toBeGreaterThan(0);
      expect(result.filtered.length).toBeGreaterThan(0);
      expect(result.filtered.length).toBeLessThan(result.allEvents.length);
      expect(result.filtered.every((e) => e.kind === 'operation')).toBe(true);
    } else {
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events.every((e) => e.kind === 'event')).toBe(true);
      expect(result.events.find((e) => e.event === DomainEvent.input).value).toEqual([
        'apple',
        'box',
      ]);
      expect(result.events.find((e) => e.event === DomainEvent.output)).toBeDefined();
    }
  },
});

runTable({
  describe: 'filterParallel',
  examples: [
    {
      name: 'keeps items where bool returns true',
      inputs: { list: ['a', 'b', 'c'], instructions: 'criteria' },
      mocks: { bool: [true, false, true] },
      want: { value: ['a', 'c'], boolCalls: 3 },
    },
    {
      name: 'passes filtering criteria into each per-item question',
      inputs: {
        list: ['x'],
        instructions: 'must include letter',
        broadcastBool: true,
      },
      want: { questionContains: ['<filtering-criteria>', 'must include letter'] },
    },
    {
      name: 'reports partial outcome when an item bool fails',
      inputs: {
        list: ['a', 'b'],
        instructions: 'x',
        options: { maxParallel: 1, strictness: 'low' },
        withEvents: true,
      },
      mocks: { bool: [true, new Error('boom')] },
      want: { value: ['a'], outcome: 'partial' },
    },
    {
      name: 'throws when list is not an array',
      inputs: { list: 'not-an-array', instructions: 'x' },
      want: { throws: /must be an array/ },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { bool });
    if (inputs.broadcastBool) vi.mocked(bool).mockResolvedValue(true);
    if (inputs.withEvents) {
      const events = [];
      const value = await filterParallel(inputs.list, inputs.instructions, {
        ...inputs.options,
        onProgress: (e) => events.push(e),
      });
      return { value, events };
    }
    return filterParallel(inputs.list, inputs.instructions, inputs.options);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('value' in want) {
      const value = result?.value ?? result;
      expect(value).toEqual(want.value);
    }
    if ('boolCalls' in want) expect(bool).toHaveBeenCalledTimes(want.boolCalls);
    if (want.questionContains) {
      const question = vi.mocked(bool).mock.calls[0][0];
      for (const fragment of want.questionContains) expect(question).toContain(fragment);
    }
    if (want.outcome) {
      const complete = result.events.find(
        (e) => e.event === 'chain:complete' && e.step === 'filter:parallel'
      );
      expect(complete.outcome).toBe(want.outcome);
    }
  },
});
