import { beforeEach, expect, vi } from 'vitest';
import { testPromptShapingOption } from '../../lib/test-utils/index.js';
import filter, { filterParallel } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import bool from '../../verblets/bool/index.js';
import { ChainEvent, DomainEvent, OpEvent } from '../../lib/progress/constants.js';
import { runTable } from '../../lib/examples-runner/index.js';

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

// ─── filter (batched) ────────────────────────────────────────────────────

runTable({
  describe: 'filter',
  examples: [
    {
      name: 'filters items in batches',
      inputs: {
        list: ['a', 'b', 'c'],
        instructions: 'a',
        options: { batchSize: 2 },
        want: ['a'],
        wantBatchCalls: 2,
      },
    },
    {
      name: 'throws on undersized LLM response in strict mode (default)',
      inputs: {
        list: ['apple', 'banana', 'box'],
        instructions: 'contains a',
        options: { batchSize: 10 },
        mock: () =>
          listBatch.mockImplementation(async (items) =>
            items.slice(0, 1).map((item) => (item.includes('a') ? 'yes' : 'no'))
          ),
        throws: /decisions for/,
      },
    },
    {
      name: 'throws on oversized LLM response in strict mode (default)',
      inputs: {
        list: ['apple', 'banana'],
        instructions: 'include all',
        options: { batchSize: 10 },
        mock: () =>
          listBatch.mockImplementation(async (items) => [...items.map(() => 'yes'), 'yes', 'yes']),
        throws: /decisions for/,
      },
    },
    {
      name: 'size-mismatch surfaces outcome=partial in resilient mode',
      inputs: {
        list: ['apple', 'banana', 'box'],
        instructions: 'contains a',
        options: { batchSize: 10, strictness: 'low' },
        withEvents: true,
        mock: () =>
          listBatch.mockImplementation(async (items) =>
            items.slice(0, 1).map((item) => (item.includes('a') ? 'yes' : 'no'))
          ),
        wantOutcome: 'partial',
      },
    },
    {
      name: 'advances batch progress on resilient failure',
      inputs: {
        list: ['a', 'b'],
        instructions: 'x',
        options: { batchSize: 10, strictness: 'low' },
        withEvents: true,
        mock: () => listBatch.mockRejectedValue(new Error('fail')),
        wantBatchEventsAtLeast: 1,
      },
    },
    {
      name: 'retries failed batches',
      inputs: {
        list: ['FAIL', 'a', 'b'],
        instructions: 'a',
        options: { batchSize: 2, maxAttempts: 2 },
        mock: () => {
          let call = 0;
          listBatch.mockImplementation(async (items) => {
            call += 1;
            if (call === 1) throw new Error('fail');
            return items.map((item) => (item.includes('a') ? 'yes' : 'no'));
          });
        },
        want: ['a'],
        wantBatchCalls: 3,
      },
    },
  ],
  process: async ({ list, instructions, options, mock, withEvents }) => {
    if (mock) mock();
    if (withEvents) {
      const events = [];
      const value = await filter(list, instructions, {
        ...options,
        onProgress: (e) => events.push(e),
      });
      return { value, events };
    }
    return filter(list, instructions, options);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('wantBatchCalls' in inputs) {
      expect(listBatch).toHaveBeenCalledTimes(inputs.wantBatchCalls);
    }
    if (inputs.wantOutcome) {
      const complete = result.events.find(
        (e) => e.step === 'filter' && e.event === 'chain:complete'
      );
      expect(complete.outcome).toBe(inputs.wantOutcome);
    }
    if (inputs.wantBatchEventsAtLeast) {
      const batches = result.events.filter((e) => e.event === 'batch:complete');
      expect(batches.length).toBeGreaterThanOrEqual(inputs.wantBatchEventsAtLeast);
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

// ─── filter (progress emission) ──────────────────────────────────────────

runTable({
  describe: 'filter — progress emission',
  examples: [
    {
      name: 'emits full lifecycle: start, input, batch progress, output, complete',
      inputs: {
        list: ['apple', 'banana', 'box'],
        options: { batchSize: 10 },
        wantFullLifecycle: true,
      },
    },
    {
      name: 'emits events in correct lifecycle order',
      inputs: {
        list: ['apple', 'box'],
        options: { batchSize: 10 },
        wantOrderedEvents: true,
      },
    },
    {
      name: 'tracks batch progress across multiple batches',
      inputs: {
        list: ['apple', 'banana', 'box', 'avocado', 'cherry'],
        options: { batchSize: 2 },
        wantMinBatches: 2,
        wantLastProcessed: 5,
      },
    },
    {
      name: 'events carry operation path and timestamp',
      inputs: { list: ['apple'], options: { batchSize: 10 }, wantTraceContext: true },
    },
  ],
  process: async ({ list, options }) => {
    const events = [];
    const value = await filter(list, 'contains a', {
      ...options,
      onProgress: (e) => events.push(e),
    });
    return { value, events };
  },
  expects: ({ result, inputs }) => {
    if (inputs.wantFullLifecycle) {
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
    if (inputs.wantOrderedEvents) {
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
    if (inputs.wantMinBatches) {
      const batches = result.events.filter((e) => e.event === OpEvent.batchComplete);
      expect(batches.length).toBeGreaterThanOrEqual(inputs.wantMinBatches);
      expect(batches[batches.length - 1].processedItems).toBe(inputs.wantLastProcessed);
    }
    if (inputs.wantTraceContext) {
      const start = result.events.find((e) => e.step === 'filter' && e.event === ChainEvent.start);
      expect(start.operation).toBeDefined();
      expect(start.timestamp).toBeDefined();
    }
  },
});

// ─── eventFilter behaviour (multi-call — runs two filter() invocations) ──

runTable({
  describe: 'filter — eventFilter',
  examples: [
    {
      name: 'respects eventFilter to receive only operation events',
      inputs: { mode: 'operation' },
    },
    {
      name: 'respects eventFilter with kind string shorthand',
      inputs: { mode: 'event-shorthand' },
    },
  ],
  process: async ({ mode }) => {
    if (mode === 'operation') {
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
  expects: ({ result, inputs }) => {
    if (inputs.mode === 'operation') {
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

// ─── filterParallel ──────────────────────────────────────────────────────

runTable({
  describe: 'filterParallel',
  examples: [
    {
      name: 'keeps items where bool returns true',
      inputs: {
        list: ['a', 'b', 'c'],
        instructions: 'criteria',
        mock: () =>
          vi
            .mocked(bool)
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false)
            .mockResolvedValueOnce(true),
        want: ['a', 'c'],
        wantBoolCalls: 3,
      },
    },
    {
      name: 'passes filtering criteria into each per-item question',
      inputs: {
        list: ['x'],
        instructions: 'must include letter',
        mock: () => vi.mocked(bool).mockResolvedValue(true),
        wantQuestionContains: ['<filtering-criteria>', 'must include letter'],
      },
    },
    {
      name: 'reports partial outcome when an item bool fails',
      inputs: {
        list: ['a', 'b'],
        instructions: 'x',
        options: { maxParallel: 1, strictness: 'low' },
        withEvents: true,
        mock: () =>
          vi.mocked(bool).mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('boom')),
        want: ['a'],
        wantOutcome: 'partial',
      },
    },
    {
      name: 'throws when list is not an array',
      inputs: { list: 'not-an-array', instructions: 'x', throws: /must be an array/ },
    },
  ],
  process: async ({ list, instructions, options, mock, withEvents }) => {
    if (mock) mock();
    if (withEvents) {
      const events = [];
      const value = await filterParallel(list, instructions, {
        ...options,
        onProgress: (e) => events.push(e),
      });
      return { value, events };
    }
    return filterParallel(list, instructions, options);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('want' in inputs) {
      const value = result.value ?? result;
      expect(value).toEqual(inputs.want);
    }
    if ('wantBoolCalls' in inputs) expect(bool).toHaveBeenCalledTimes(inputs.wantBoolCalls);
    if (inputs.wantQuestionContains) {
      const question = vi.mocked(bool).mock.calls[0][0];
      for (const fragment of inputs.wantQuestionContains) expect(question).toContain(fragment);
    }
    if (inputs.wantOutcome) {
      const complete = result.events.find(
        (e) => e.event === 'chain:complete' && e.step === 'filter:parallel'
      );
      expect(complete.outcome).toBe(inputs.wantOutcome);
    }
  },
});
