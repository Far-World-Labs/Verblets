import { beforeEach, expect, vi } from 'vitest';
import { testPromptShapingOption } from '../../lib/test-utils/index.js';
import filter, { filterParallel } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import bool from '../../verblets/bool/index.js';
import { ChainEvent, DomainEvent, OpEvent } from '../../lib/progress/constants.js';
import { runTable, equals, all, throws } from '../../lib/examples-runner/index.js';

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

// ─── filter (batched) ─────────────────────────────────────────────────────

const filterExamples = [
  {
    name: 'filters items in batches',
    inputs: { list: ['a', 'b', 'c'], instructions: 'a', options: { batchSize: 2 } },
    check: all(equals(['a']), () => expect(listBatch).toHaveBeenCalledTimes(2)),
  },
  {
    name: 'throws on undersized LLM response in strict mode (default)',
    inputs: {
      list: ['apple', 'banana', 'box'],
      instructions: 'contains a',
      options: { batchSize: 10 },
      preMock: () =>
        listBatch.mockImplementation(async (items) =>
          items.slice(0, 1).map((item) => (item.includes('a') ? 'yes' : 'no'))
        ),
    },
    check: throws(/decisions for/),
  },
  {
    name: 'throws on oversized LLM response in strict mode (default)',
    inputs: {
      list: ['apple', 'banana'],
      instructions: 'include all',
      options: { batchSize: 10 },
      preMock: () =>
        listBatch.mockImplementation(async (items) => [...items.map(() => 'yes'), 'yes', 'yes']),
    },
    check: throws(/decisions for/),
  },
  {
    name: 'size-mismatch surfaces outcome=partial in resilient mode',
    inputs: {
      list: ['apple', 'banana', 'box'],
      instructions: 'contains a',
      options: { batchSize: 10, strictness: 'low' },
      withEvents: true,
      preMock: () =>
        listBatch.mockImplementation(async (items) =>
          items.slice(0, 1).map((item) => (item.includes('a') ? 'yes' : 'no'))
        ),
    },
    check: ({ result }) => {
      const complete = result.events.find(
        (e) => e.step === 'filter' && e.event === 'chain:complete'
      );
      expect(complete.outcome).toBe('partial');
    },
  },
  {
    name: 'advances batch progress on resilient failure',
    inputs: {
      list: ['a', 'b'],
      instructions: 'x',
      options: { batchSize: 10, strictness: 'low' },
      withEvents: true,
      preMock: () => listBatch.mockRejectedValue(new Error('fail')),
    },
    check: ({ result }) => {
      const batches = result.events.filter((e) => e.event === 'batch:complete');
      expect(batches.length).toBeGreaterThan(0);
    },
  },
  {
    name: 'retries failed batches',
    inputs: {
      list: ['FAIL', 'a', 'b'],
      instructions: 'a',
      options: { batchSize: 2, maxAttempts: 2 },
      preMock: () => {
        let call = 0;
        listBatch.mockImplementation(async (items) => {
          call += 1;
          if (call === 1) throw new Error('fail');
          return items.map((item) => (item.includes('a') ? 'yes' : 'no'));
        });
      },
    },
    check: all(equals(['a']), () => expect(listBatch).toHaveBeenCalledTimes(3)),
  },
];

runTable({
  describe: 'filter',
  examples: filterExamples,
  process: async ({ list, instructions, options, preMock, withEvents }) => {
    if (preMock) preMock();
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
});

testPromptShapingOption('strictness', {
  invoke: (config) => filter(['apple', 'box'], 'contains a', { batchSize: 10, ...config }),
  setupMocks: () => {},
  llmMock: listBatch,
  markers: { low: 'err on the side of inclusion', high: 'err on the side of exclusion' },
  promptArgIndex: 1,
});

// ─── filter (progress emission) ───────────────────────────────────────────

const progressExamples = [
  {
    name: 'emits full lifecycle: start, input, batch progress, output, complete',
    inputs: { list: ['apple', 'banana', 'box'], options: { batchSize: 10 } },
    check: ({ result }) => {
      const { events, value } = result;
      const start = events.find((e) => e.step === 'filter' && e.event === ChainEvent.start);
      expect(start.kind).toBe('telemetry');

      const input = events.find((e) => e.step === 'filter' && e.event === DomainEvent.input);
      expect(input).toMatchObject({ kind: 'event', value: ['apple', 'banana', 'box'] });

      const opStart = events.find(
        (e) => e.step === 'filter' && e.event === OpEvent.start && e.kind === 'operation'
      );
      expect(opStart).toMatchObject({ totalItems: 3, totalBatches: 1 });

      const batchComplete = events.find(
        (e) => e.step === 'filter' && e.event === OpEvent.batchComplete
      );
      expect(batchComplete).toMatchObject({ kind: 'operation', processedItems: 3 });

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
        inputCount: 3,
        outputCount: value.length,
        outcome: 'success',
      });
    },
  },
  {
    name: 'emits events in correct lifecycle order',
    inputs: { list: ['apple', 'box'], options: { batchSize: 10 } },
    check: ({ result }) => {
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
    },
  },
  {
    name: 'tracks batch progress across multiple batches',
    inputs: {
      list: ['apple', 'banana', 'box', 'avocado', 'cherry'],
      options: { batchSize: 2 },
    },
    check: ({ result }) => {
      const batches = result.events.filter((e) => e.event === OpEvent.batchComplete);
      expect(batches.length).toBeGreaterThanOrEqual(2);
      expect(batches[batches.length - 1].processedItems).toBe(5);
    },
  },
  {
    name: 'events carry operation path and timestamp',
    inputs: { list: ['apple'], options: { batchSize: 10 } },
    check: ({ result }) => {
      const start = result.events.find((e) => e.step === 'filter' && e.event === ChainEvent.start);
      expect(start.operation).toBeDefined();
      expect(start.timestamp).toBeDefined();
    },
  },
];

runTable({
  describe: 'filter — progress emission',
  examples: progressExamples,
  process: async ({ list, options }) => {
    const events = [];
    const value = await filter(list, 'contains a', {
      ...options,
      onProgress: (e) => events.push(e),
    });
    return { value, events };
  },
});

// ─── eventFilter behavior (two parallel calls — kept inline) ──────────────

runTable({
  describe: 'filter — eventFilter',
  examples: [
    {
      name: 'respects eventFilter to receive only operation events',
      inputs: {},
      check: async () => {
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
        expect(allEvents.filter((e) => e.kind !== 'operation').length).toBeGreaterThan(0);
        expect(filtered.length).toBeGreaterThan(0);
        expect(filtered.length).toBeLessThan(allEvents.length);
        expect(filtered.every((e) => e.kind === 'operation')).toBe(true);
      },
    },
    {
      name: 'respects eventFilter with kind string shorthand',
      inputs: {},
      check: async () => {
        const events = [];
        await filter(['apple', 'box'], 'contains a', {
          batchSize: 10,
          onProgress: (e) => events.push(e),
          eventFilter: 'event',
        });
        expect(events.length).toBeGreaterThan(0);
        expect(events.every((e) => e.kind === 'event')).toBe(true);
        expect(events.find((e) => e.event === DomainEvent.input).value).toEqual(['apple', 'box']);
        expect(events.find((e) => e.event === DomainEvent.output)).toBeDefined();
      },
    },
  ],
  process: () => undefined,
});

// ─── filterParallel ───────────────────────────────────────────────────────

const filterParallelExamples = [
  {
    name: 'keeps items where bool returns true',
    inputs: {
      list: ['a', 'b', 'c'],
      instructions: 'criteria',
      preMock: () =>
        vi
          .mocked(bool)
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(true),
    },
    check: all(equals(['a', 'c']), () => expect(bool).toHaveBeenCalledTimes(3)),
  },
  {
    name: 'passes filtering criteria into each per-item question',
    inputs: {
      list: ['x'],
      instructions: 'must include letter',
      preMock: () => vi.mocked(bool).mockResolvedValue(true),
    },
    check: () => {
      const question = vi.mocked(bool).mock.calls[0][0];
      expect(question).toContain('<filtering-criteria>');
      expect(question).toContain('must include letter');
    },
  },
  {
    name: 'reports partial outcome when an item bool fails',
    inputs: {
      list: ['a', 'b'],
      instructions: 'x',
      options: { maxParallel: 1, strictness: 'low' },
      withEvents: true,
      preMock: () =>
        vi.mocked(bool).mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('boom')),
    },
    check: ({ result }) => {
      expect(result.value).toEqual(['a']);
      const complete = result.events.find(
        (e) => e.event === 'chain:complete' && e.step === 'filter:parallel'
      );
      expect(complete.outcome).toBe('partial');
    },
  },
  {
    name: 'throws when list is not an array',
    inputs: { list: 'not-an-array', instructions: 'x' },
    check: throws(/must be an array/),
  },
];

runTable({
  describe: 'filterParallel',
  examples: filterParallelExamples,
  process: async ({ list, instructions, options, preMock, withEvents }) => {
    if (preMock) preMock();
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
});
