import { beforeEach, describe, expect, it, vi } from 'vitest';
import reduce from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import { ChainEvent, DomainEvent, OpEvent, Outcome } from '../../lib/progress/constants.js';

vi.mock('../../lib/text-batch/index.js', () => ({
  default: vi.fn((list) => {
    // Simple batching for tests
    const batches = [];
    for (let i = 0; i < list.length; i += 2) {
      const items = list.slice(i, i + 2);
      batches.push({ items, startIndex: i });
    }
    return batches;
  }),
}));

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => fn()),
}));

vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(async (items, instructions) => {
    // Simulate reduce behavior: take accumulator from instructions and append items
    const instructionText =
      typeof instructions === 'function'
        ? instructions({ style: 'newline', count: items.length })
        : instructions;

    // Extract accumulator from the instruction text (simplified for test)
    const accMatch = instructionText.match(/<accumulator>(.*?)<\/accumulator>/s);
    let acc = accMatch ? accMatch[1].trim() : '';

    // Handle the "No initial value" case
    if (acc.includes('No initial value')) {
      acc = '';
    }

    const result = [acc, ...items].filter(Boolean).join('-');
    return { accumulator: result };
  }),
  ListStyle: {
    NEWLINE: 'newline',
    XML: 'xml',
    AUTO: 'auto',
  },
  determineStyle: vi.fn(() => 'newline'),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('reduce chain', () => {
  it('reduces in batches', async () => {
    const result = await reduce(['a', 'b', 'c', 'd'], 'join', { batchSize: 2 });
    expect(result).toBe('a-b-c-d');
    expect(listBatch).toHaveBeenCalledTimes(2);
  });

  it('uses initial value', async () => {
    const result = await reduce(['x', 'y'], 'join', { initial: '0', batchSize: 2 });
    expect(result).toBe('0-x-y');
    expect(listBatch).toHaveBeenCalledTimes(1);
  });

  describe('custom responseFormat', () => {
    const statsFormat = {
      type: 'json_schema',
      json_schema: {
        name: 'stats',
        schema: {
          type: 'object',
          properties: {
            sum: { type: 'number' },
            count: { type: 'number' },
          },
          required: ['sum', 'count'],
          additionalProperties: false,
        },
      },
    };

    it('returns result directly without unwrapping accumulator', async () => {
      listBatch.mockResolvedValueOnce({ sum: 10, count: 2 });
      const result = await reduce(['a', 'b'], 'sum values', {
        batchSize: 2,
        responseFormat: statsFormat,
        initial: { sum: 0, count: 0 },
      });
      expect(result).toEqual({ sum: 10, count: 2 });
    });

    it('passes custom responseFormat through to listBatch', async () => {
      listBatch.mockResolvedValueOnce({ sum: 5, count: 1 });
      await reduce(['a'], 'sum', { batchSize: 2, responseFormat: statsFormat });
      const callConfig = listBatch.mock.calls[0][2];
      expect(callConfig.responseFormat).toBe(statsFormat);
    });

    it('chains accumulator across batches with custom format', async () => {
      listBatch
        .mockResolvedValueOnce({ sum: 3, count: 2 })
        .mockResolvedValueOnce({ sum: 8, count: 4 });
      const result = await reduce(['a', 'b', 'c', 'd'], 'sum values', {
        batchSize: 2,
        responseFormat: statsFormat,
        initial: { sum: 0, count: 0 },
      });
      // Second batch gets the first batch's result as accumulator
      expect(result).toEqual({ sum: 8, count: 4 });
      expect(listBatch).toHaveBeenCalledTimes(2);
      const secondCallPrompt = listBatch.mock.calls[1][1];
      expect(secondCallPrompt).toContain('"sum":');
    });
  });

  it('uses initial value with more elements', async () => {
    const result = await reduce(['x', 'y', 'z'], 'join', { initial: '0', batchSize: 2 });
    expect(result).toBe('0-x-y-z');
    expect(listBatch).toHaveBeenCalledTimes(2);
  });

  describe('incremental batch progress', () => {
    it('emits batch:complete events as each batch finishes', async () => {
      const progressEvents = [];
      const onProgress = vi.fn((event) => progressEvents.push(event));

      await reduce(['a', 'b', 'c', 'd', 'e'], 'join', {
        batchSize: 2,
        onProgress,
      });

      const batchEvents = progressEvents.filter(
        (e) => e.step === 'reduce' && e.event === OpEvent.batchComplete
      );
      // 5 items in batches of 2 → 3 batches
      expect(batchEvents).toHaveLength(3);

      // processedItems grows incrementally
      expect(batchEvents[0].processedItems).toBe(2);
      expect(batchEvents[0].totalItems).toBe(5);
      expect(batchEvents[1].processedItems).toBe(4);
      expect(batchEvents[2].processedItems).toBe(5);
    });

    it('reports progress ratio on each batch event', async () => {
      const progressEvents = [];
      const onProgress = vi.fn((event) => progressEvents.push(event));

      await reduce(['a', 'b', 'c', 'd'], 'join', {
        batchSize: 2,
        onProgress,
      });

      const batchEvents = progressEvents.filter(
        (e) => e.step === 'reduce' && e.event === OpEvent.batchComplete
      );
      expect(batchEvents).toHaveLength(2);
      expect(batchEvents[0].progress).toBeCloseTo(0.5);
      expect(batchEvents[1].progress).toBeCloseTo(1.0);
    });

    it('brackets batch processing with operation start and complete', async () => {
      const progressEvents = [];
      const onProgress = vi.fn((event) => progressEvents.push(event));

      await reduce(['a', 'b', 'c', 'd'], 'join', {
        batchSize: 2,
        onProgress,
      });

      const opEvents = progressEvents.filter(
        (e) => e.step === 'reduce' && (e.event === OpEvent.start || e.event === OpEvent.complete)
      );
      expect(opEvents).toHaveLength(2);
      expect(opEvents[0].event).toBe(OpEvent.start);
      expect(opEvents[0].totalItems).toBe(4);
      expect(opEvents[0].totalBatches).toBe(2);
      expect(opEvents[1].event).toBe(OpEvent.complete);
      expect(opEvents[1].totalItems).toBe(4);
    });

    it('emits full lifecycle: start → input → batch:complete → output → complete', async () => {
      const progressEvents = [];
      const onProgress = vi.fn((event) => progressEvents.push(event));

      await reduce(['a', 'b', 'c'], 'join', {
        batchSize: 2,
        onProgress,
      });

      const stepEvents = progressEvents.filter((e) => e.step === 'reduce');
      const eventNames = stepEvents.map((e) => e.event);

      expect(eventNames[0]).toBe(ChainEvent.start);
      expect(eventNames).toContain(DomainEvent.input);
      expect(eventNames).toContain(OpEvent.batchComplete);
      expect(eventNames).toContain(DomainEvent.output);
      expect(eventNames[eventNames.length - 1]).toBe(ChainEvent.complete);

      // batch:complete events appear between input and output
      const inputIdx = eventNames.indexOf(DomainEvent.input);
      const outputIdx = eventNames.indexOf(DomainEvent.output);
      const batchIdx = eventNames.indexOf(OpEvent.batchComplete);
      expect(batchIdx).toBeGreaterThan(inputIdx);
      expect(batchIdx).toBeLessThan(outputIdx);
    });

    it('complete event reports batch and item counts with success outcome', async () => {
      const progressEvents = [];
      const onProgress = vi.fn((event) => progressEvents.push(event));

      await reduce(['a', 'b', 'c', 'd'], 'join', {
        batchSize: 2,
        onProgress,
      });

      const completeEvent = progressEvents.find(
        (e) => e.step === 'reduce' && e.event === ChainEvent.complete
      );
      expect(completeEvent).toBeDefined();
      expect(completeEvent.totalItems).toBe(4);
      expect(completeEvent.totalBatches).toBe(2);
      expect(completeEvent.outcome).toBe(Outcome.success);
    });

    it('threads accumulator through batches with incremental tracking', async () => {
      const accumulators = [];
      listBatch.mockImplementation(async (items, instructions) => {
        const accMatch = instructions.match(/<accumulator>(.*?)<\/accumulator>/s);
        const acc = accMatch ? accMatch[1].trim() : '';
        const result = [acc, ...items].filter(Boolean).join('-');
        accumulators.push(result);
        return { accumulator: result };
      });

      const progressEvents = [];
      const onProgress = vi.fn((event) => progressEvents.push(event));

      const result = await reduce(['a', 'b', 'c', 'd'], 'join', {
        batchSize: 2,
        initial: 'start',
        onProgress,
      });

      // Accumulator grows through each batch
      expect(accumulators[0]).toBe('start-a-b');
      expect(accumulators[1]).toBe('start-a-b-c-d');
      expect(result).toBe('start-a-b-c-d');

      // One batch:complete per batch, each reflecting progress
      const batchEvents = progressEvents.filter(
        (e) => e.step === 'reduce' && e.event === OpEvent.batchComplete
      );
      expect(batchEvents).toHaveLength(2);
      expect(batchEvents[0].processedItems).toBe(2);
      expect(batchEvents[1].processedItems).toBe(4);
    });
  });
});
