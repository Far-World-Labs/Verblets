import { beforeEach, describe, expect, it, vi } from 'vitest';
import { testPromptShapingOption } from '../../lib/test-utils/index.js';
import filter from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import { ChainEvent, DomainEvent, OpEvent } from '../../lib/progress/constants.js';

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

vi.mock('../../lib/retry/index.js', () => {
  const mock = vi.fn(async (fn) => {
    try {
      return await fn();
    } catch {
      // Retry once on failure
      return await fn();
    }
  });
  return { default: mock };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('filter', () => {
  it('filters items in batches', async () => {
    const result = await filter(['a', 'b', 'c'], 'a', { batchSize: 2 });
    expect(result).toStrictEqual(['a']);
    expect(listBatch).toHaveBeenCalledTimes(2);
  });

  it('handles undersized LLM response by defaulting missing items to excluded', async () => {
    listBatch.mockImplementation(async (items) => {
      // Return fewer decisions than items sent
      return items.slice(0, 1).map((item) => (item.includes('a') ? 'yes' : 'no'));
    });

    const result = await filter(['apple', 'banana', 'box'], 'contains a', { batchSize: 10 });
    // Only the first item got a real decision; rest default to excluded
    expect(result).toStrictEqual(['apple']);
  });

  it('handles oversized LLM response without corruption', async () => {
    listBatch.mockImplementation(async (items) => {
      // Return more decisions than items sent
      return [...items.map(() => 'yes'), 'yes', 'yes'];
    });

    const result = await filter(['apple', 'banana'], 'include all', { batchSize: 10 });
    // Should include exactly the original items, no extras
    expect(result).toStrictEqual(['apple', 'banana']);
  });

  it('advances batch progress on resilient failure', async () => {
    listBatch.mockRejectedValue(new Error('fail'));

    const events = [];
    await filter(['a', 'b'], 'x', {
      batchSize: 10,
      strictness: 'low',
      onProgress: (e) => events.push(e),
    });

    const batchEvents = events.filter((e) => e.event === 'batch:complete');
    expect(batchEvents.length).toBeGreaterThan(0);
  });

  it('retries failed batches', async () => {
    let call = 0;
    listBatch.mockImplementation(async (items) => {
      call += 1;
      if (call === 1) throw new Error('fail');
      return items.map((item) => (item.includes('a') ? 'yes' : 'no'));
    });

    const result = await filter(['FAIL', 'a', 'b'], 'a', {
      batchSize: 2,
      maxAttempts: 2,
    });
    expect(result).toStrictEqual(['a']);
    expect(listBatch).toHaveBeenCalledTimes(3);
  });

  testPromptShapingOption('strictness', {
    invoke: (config) => filter(['apple', 'box'], 'contains a', { batchSize: 10, ...config }),
    setupMocks: () => {},
    llmMock: listBatch,
    markers: { low: 'err on the side of inclusion', high: 'err on the side of exclusion' },
    promptArgIndex: 1,
  });

  describe('progress emission', () => {
    it('emits full lifecycle: start, input, batch progress, output, complete', async () => {
      const events = [];
      const result = await filter(['apple', 'banana', 'box'], 'contains a', {
        batchSize: 10,
        onProgress: (e) => events.push(e),
      });

      const chainStart = events.find((e) => e.step === 'filter' && e.event === ChainEvent.start);
      expect(chainStart).toBeDefined();
      expect(chainStart.kind).toBe('telemetry');

      const inputEvent = events.find((e) => e.step === 'filter' && e.event === DomainEvent.input);
      expect(inputEvent).toBeDefined();
      expect(inputEvent.kind).toBe('event');
      expect(inputEvent.value).toEqual(['apple', 'banana', 'box']);

      const opStart = events.find(
        (e) => e.step === 'filter' && e.event === OpEvent.start && e.kind === 'operation'
      );
      expect(opStart).toBeDefined();
      expect(opStart.totalItems).toBe(3);
      expect(opStart.totalBatches).toBe(1);

      const batchComplete = events.find(
        (e) => e.step === 'filter' && e.event === OpEvent.batchComplete
      );
      expect(batchComplete).toBeDefined();
      expect(batchComplete.kind).toBe('operation');
      expect(batchComplete.processedItems).toBe(3);

      const opComplete = events.find(
        (e) => e.step === 'filter' && e.event === OpEvent.complete && e.kind === 'operation'
      );
      expect(opComplete).toBeDefined();

      const outputEvent = events.find((e) => e.step === 'filter' && e.event === DomainEvent.output);
      expect(outputEvent).toBeDefined();
      expect(outputEvent.kind).toBe('event');
      expect(outputEvent.value).toEqual(result);

      const chainComplete = events.find(
        (e) => e.step === 'filter' && e.event === ChainEvent.complete
      );
      expect(chainComplete).toBeDefined();
      expect(chainComplete.kind).toBe('telemetry');
      expect(chainComplete.inputCount).toBe(3);
      expect(chainComplete.outputCount).toBe(result.length);
      expect(chainComplete.outcome).toBe('success');
    });

    it('emits events in correct lifecycle order', async () => {
      const events = [];
      await filter(['apple', 'box'], 'contains a', {
        batchSize: 10,
        onProgress: (e) => events.push(e),
      });

      const eventNames = events.map((e) => e.event);
      const startIdx = eventNames.indexOf(ChainEvent.start);
      const inputIdx = eventNames.indexOf(DomainEvent.input);
      const opStartIdx = eventNames.indexOf(OpEvent.start);
      const opCompleteIdx = eventNames.indexOf(OpEvent.complete);
      const outputIdx = eventNames.indexOf(DomainEvent.output);
      const completeIdx = eventNames.indexOf(ChainEvent.complete);

      expect(startIdx).toBeLessThan(inputIdx);
      expect(inputIdx).toBeLessThan(opStartIdx);
      expect(opStartIdx).toBeLessThan(opCompleteIdx);
      expect(opCompleteIdx).toBeLessThan(outputIdx);
      expect(outputIdx).toBeLessThan(completeIdx);
    });

    it('tracks batch progress across multiple batches', async () => {
      const events = [];
      await filter(['apple', 'banana', 'box', 'avocado', 'cherry'], 'contains a', {
        batchSize: 2,
        onProgress: (e) => events.push(e),
      });

      const batchEvents = events.filter((e) => e.event === OpEvent.batchComplete);
      expect(batchEvents.length).toBeGreaterThanOrEqual(2);

      const lastBatch = batchEvents[batchEvents.length - 1];
      expect(lastBatch.processedItems).toBe(5);
    });

    it('respects eventFilter to receive only operation events', async () => {
      const allEvents = [];
      const filteredEvents = [];
      await filter(['apple', 'box'], 'contains a', {
        batchSize: 10,
        onProgress: (e) => allEvents.push(e),
      });
      await filter(['apple', 'box'], 'contains a', {
        batchSize: 10,
        onProgress: (e) => filteredEvents.push(e),
        eventFilter: (e) => e.kind === 'operation',
      });

      const nonOperationCount = allEvents.filter((e) => e.kind !== 'operation').length;
      expect(nonOperationCount).toBeGreaterThan(0);

      expect(filteredEvents.length).toBeGreaterThan(0);
      expect(filteredEvents.length).toBeLessThan(allEvents.length);
      expect(filteredEvents.every((e) => e.kind === 'operation')).toBe(true);
    });

    it('respects eventFilter with kind string shorthand', async () => {
      const events = [];
      await filter(['apple', 'box'], 'contains a', {
        batchSize: 10,
        onProgress: (e) => events.push(e),
        eventFilter: 'event',
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events.every((e) => e.kind === 'event')).toBe(true);

      const inputEvent = events.find((e) => e.event === DomainEvent.input);
      expect(inputEvent).toBeDefined();
      expect(inputEvent.value).toEqual(['apple', 'box']);

      const outputEvent = events.find((e) => e.event === DomainEvent.output);
      expect(outputEvent).toBeDefined();
    });

    it('events carry operation path and timestamp', async () => {
      const events = [];
      await filter(['apple'], 'contains a', {
        batchSize: 10,
        onProgress: (e) => events.push(e),
      });

      const chainStart = events.find((e) => e.step === 'filter' && e.event === ChainEvent.start);
      expect(chainStart.operation).toBeDefined();
      expect(chainStart.timestamp).toBeDefined();
    });
  });
});
