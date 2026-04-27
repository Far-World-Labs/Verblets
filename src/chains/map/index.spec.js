import { beforeEach, describe, expect, it, vi } from 'vitest';
import map, { streamingMap } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import { OpEvent, ChainEvent, DomainEvent } from '../../lib/progress/constants.js';

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
  default: vi.fn(async (items, _instructions) => {
    if (items.includes('FAIL')) throw new Error('fail');
    // For tests, just append 'x' to show the transformation worked
    // (the actual prompt content doesn't matter for these tests)
    return items.map((i) => `${i}-x`);
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

describe('map', () => {
  it('maps fragments in batches', async () => {
    const result = await map(['a', 'b', 'c'], 'x', { batchSize: 2 });
    expect(result).toStrictEqual(['a-x', 'b-x', 'c-x']);
    expect(listBatch).toHaveBeenCalledTimes(2);
  });

  it('throws when all items fail', async () => {
    listBatch.mockRejectedValueOnce(new Error('fail'));
    await expect(map(['FAIL', 'oops'], 'x', { batchSize: 2 })).rejects.toThrow(
      'all 2 items failed'
    );
  });

  it('caps oversized LLM output to prevent overflow into adjacent batches', async () => {
    let call = 0;
    listBatch.mockImplementation(async (items) => {
      call += 1;
      if (call === 1) return ['a-x', 'b-x', 'OVERFLOW-1', 'OVERFLOW-2'];
      return items.map((i) => `${i}-x`);
    });

    const result = await map(['a', 'b', 'c', 'd'], 'x', { batchSize: 2 });
    expect(result).toStrictEqual(['a-x', 'b-x', 'c-x', 'd-x']);
  });

  it('handles undersized LLM output by retrying missing items', async () => {
    let call = 0;
    listBatch.mockImplementation(async (items) => {
      call += 1;
      if (call === 1) return ['a-x'];
      return items.map((i) => `${i}-x`);
    });

    const result = await map(['a', 'b', 'c', 'd'], 'x', {
      batchSize: 2,
      maxAttempts: 2,
    });
    expect(result).toStrictEqual(['a-x', 'b-x', 'c-x', 'd-x']);
  });

  it('retries only failed fragments', async () => {
    let call = 0;
    listBatch.mockImplementation(async (items, _instructions) => {
      call += 1;
      if (call === 1) throw new Error('fail');
      return items.map((l) => l.toUpperCase());
    });

    const result = await map(['alpha', 'beta'], 'upper', {
      batchSize: 2,
      maxAttempts: 2,
    });
    expect(result).toStrictEqual(['ALPHA', 'BETA']);
    expect(listBatch).toHaveBeenCalledTimes(2);
  });

  it('retries multiple times', async () => {
    let call = 0;
    listBatch.mockImplementation(async (items, _instructions) => {
      call += 1;
      if (call === 1) throw new Error('fail');
      if (call === 2) throw new Error('fail');
      return items.map((l) => l.toUpperCase());
    });

    const result = await map(['alpha', 'beta'], 'upper', {
      batchSize: 2,
      maxAttempts: 3,
    });
    expect(result).toStrictEqual(['ALPHA', 'BETA']);
    expect(listBatch).toHaveBeenCalledTimes(3);
  });

  describe('progress callbacks', () => {
    it('emits progress events during batch processing', async () => {
      const progressEvents = [];
      const onProgress = vi.fn((event) => {
        progressEvents.push(event);
      });

      await map(['a', 'b', 'c', 'd'], 'transform', {
        batchSize: 2,
        onProgress,
      });

      // Check start event from parent emitter
      const startEvent = progressEvents.find(
        (e) => e.step === 'map' && e.event === ChainEvent.start
      );
      expect(startEvent).toBeDefined();

      // Check complete event includes result metadata
      const completeEvent = progressEvents.find(
        (e) => e.step === 'map' && e.event === ChainEvent.complete
      );
      expect(completeEvent).toBeDefined();
      expect(completeEvent.totalItems).toBe(4);
      expect(completeEvent.successCount).toBe(4);
    });

    it('includes retry events in progress', async () => {
      const progressEvents = [];
      const onProgress = vi.fn((event) => {
        progressEvents.push(event);
      });

      await map(['a', 'b'], 'transform', {
        batchSize: 2,
        onProgress,
      });

      // Check for retry lifecycle events
      const retryStartEvents = progressEvents.filter(
        (e) => e.step === 'map:batch' && e.event === 'start'
      );
      expect(retryStartEvents.length).toBeGreaterThan(0);

      const retryCompleteEvents = progressEvents.filter(
        (e) => e.step === 'map:batch' && e.event === 'complete'
      );
      expect(retryCompleteEvents.length).toBeGreaterThan(0);
    });

    it('tracks processed items correctly', async () => {
      const progressEvents = [];
      const onProgress = vi.fn((event) => {
        progressEvents.push(event);
      });

      await map(['a', 'b', 'c', 'd', 'e'], 'transform', {
        batchSize: 2,
        onProgress,
      });

      // Complete event should report total and successful items
      const completeEvent = progressEvents.find(
        (e) => e.step === 'map' && e.event === ChainEvent.complete
      );
      expect(completeEvent).toBeDefined();
      expect(completeEvent.totalItems).toBe(5);
      expect(completeEvent.successCount).toBeLessThanOrEqual(5);
    });

    it('includes result metadata in complete event', async () => {
      const progressEvents = [];
      const onProgress = vi.fn((event) => {
        progressEvents.push(event);
      });

      await map(['a', 'b', 'c'], 'transform', {
        batchSize: 2,
        onProgress,
      });

      // Complete event carries outcome and item counts
      const completeEvent = progressEvents.find(
        (e) => e.step === 'map' && e.event === ChainEvent.complete
      );
      expect(completeEvent).toBeDefined();
      expect(completeEvent.totalItems).toBe(3);
      expect(completeEvent.outcome).toBeDefined();
      expect(completeEvent.successCount).toBeDefined();
      expect(completeEvent.failedItems).toBeDefined();
    });
  });

  describe('incremental batch progress', () => {
    it('emits batch:complete events as each batch finishes', async () => {
      const progressEvents = [];
      const onProgress = vi.fn((event) => progressEvents.push(event));

      await map(['a', 'b', 'c', 'd', 'e'], 'transform', {
        batchSize: 2,
        onProgress,
      });

      const batchEvents = progressEvents.filter(
        (e) => e.step === 'map' && e.event === OpEvent.batchComplete
      );
      // 5 items in batches of 2 → 3 batches (2, 2, 1)
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

      await map(['a', 'b', 'c', 'd'], 'transform', {
        batchSize: 2,
        onProgress,
      });

      const batchEvents = progressEvents.filter(
        (e) => e.step === 'map' && e.event === OpEvent.batchComplete
      );
      expect(batchEvents).toHaveLength(2);
      expect(batchEvents[0].progress).toBeCloseTo(0.5);
      expect(batchEvents[1].progress).toBeCloseTo(1.0);
    });

    it('emits batch progress even when some batches fail', async () => {
      let call = 0;
      listBatch.mockImplementation(async (items) => {
        call += 1;
        if (call === 1) throw new Error('first batch fails');
        return items.map((i) => `${i}-x`);
      });

      const progressEvents = [];
      const onProgress = vi.fn((event) => progressEvents.push(event));

      const result = await map(['a', 'b', 'c', 'd'], 'transform', {
        batchSize: 2,
        maxAttempts: 1,
        onProgress,
      });

      // Failed slots are undefined; successful slots are transformed
      expect(result[0]).toBeUndefined();
      expect(result[1]).toBeUndefined();
      expect(result[2]).toBe('c-x');
      expect(result[3]).toBe('d-x');

      const completeEvent = progressEvents.find(
        (e) => e.step === 'map' && e.event === ChainEvent.complete
      );
      expect(completeEvent.outcome).toBe('partial');
      expect(completeEvent.failedItems).toBe(2);
      expect(completeEvent.successCount).toBe(2);
    });
  });
});

describe('streamingMap', () => {
  it('yields cumulative results after each batch', async () => {
    const yields = [];
    for await (const partial of streamingMap(['a', 'b', 'c', 'd'], 'transform', {
      batchSize: 2,
    })) {
      yields.push(partial);
    }

    // Two batches of 2 → two yields
    expect(yields).toHaveLength(2);

    // First yield: first two items transformed, rest still undefined (unprocessed)
    expect(yields[0][0]).toBe('a-x');
    expect(yields[0][1]).toBe('b-x');
    expect(yields[0][2]).toBeUndefined();
    expect(yields[0][3]).toBeUndefined();

    // Second yield: all items filled
    expect(yields[1][0]).toBe('a-x');
    expect(yields[1][1]).toBe('b-x');
    expect(yields[1][2]).toBe('c-x');
    expect(yields[1][3]).toBe('d-x');
  });

  it('emits partial domain events matching each yield', async () => {
    const progressEvents = [];
    const onProgress = vi.fn((event) => progressEvents.push(event));

    const yields = [];
    for await (const partial of streamingMap(['a', 'b', 'c', 'd', 'e'], 'transform', {
      batchSize: 2,
      onProgress,
    })) {
      yields.push(partial);
    }

    const partialEvents = progressEvents.filter(
      (e) => e.step === 'streaming-map' && e.event === DomainEvent.partial
    );
    // One partial event per batch yield
    expect(partialEvents).toHaveLength(yields.length);

    // Each partial event carries the cumulative snapshot; unprocessed slots are undefined
    expect(partialEvents[0].value[0]).toBe('a-x');
    expect(partialEvents[0].value[2]).toBeUndefined();
    expect(partialEvents[1].value[2]).toBe('c-x');
  });

  it('emits batch:complete events incrementally', async () => {
    const progressEvents = [];
    const onProgress = vi.fn((event) => progressEvents.push(event));

    const chunks = [];
    for await (const partial of streamingMap(['a', 'b', 'c'], 'transform', {
      batchSize: 2,
      onProgress,
    })) {
      chunks.push(partial);
    }

    expect(chunks.length).toBeGreaterThan(0);
    const batchEvents = progressEvents.filter(
      (e) => e.step === 'streaming-map' && e.event === OpEvent.batchComplete
    );
    expect(batchEvents).toHaveLength(2);
    expect(batchEvents[0].processedItems).toBe(2);
    expect(batchEvents[0].totalItems).toBe(3);
    expect(batchEvents[1].processedItems).toBe(3);
  });

  it('caps oversized LLM output to prevent overflow into adjacent batches', async () => {
    listBatch.mockImplementation(async (items) => {
      return [...items.map((i) => `${i}-x`), 'OVERFLOW-1', 'OVERFLOW-2'];
    });

    const yields = [];
    for await (const partial of streamingMap(['a', 'b', 'c', 'd'], 'transform', {
      batchSize: 2,
    })) {
      yields.push(partial);
    }

    expect(yields).toHaveLength(2);
    expect(yields[1]).toStrictEqual(['a-x', 'b-x', 'c-x', 'd-x']);
  });

  it('marks failed batch items as undefined in cumulative yields', async () => {
    let call = 0;
    listBatch.mockImplementation(async (items) => {
      call += 1;
      if (call === 2) throw new Error('second batch fails');
      return items.map((i) => `${i}-x`);
    });

    const yields = [];
    for await (const partial of streamingMap(['a', 'b', 'c', 'd', 'e', 'f'], 'transform', {
      batchSize: 2,
    })) {
      yields.push(partial);
    }

    // 3 batches: first succeeds, second fails, third succeeds
    expect(yields).toHaveLength(3);

    // After first batch — processed items transformed, rest still undefined
    expect(yields[0][0]).toBe('a-x');
    expect(yields[0][1]).toBe('b-x');
    expect(yields[0][2]).toBeUndefined();

    // After second batch (failed) — items 2,3 stay undefined
    expect(yields[1][2]).toBeUndefined();
    expect(yields[1][3]).toBeUndefined();

    // After third batch — items 4,5 filled, 2,3 still undefined
    expect(yields[2][4]).toBe('e-x');
    expect(yields[2][5]).toBe('f-x');
    expect(yields[2][2]).toBeUndefined();
    expect(yields[2][3]).toBeUndefined();
  });

  it('emits full lifecycle: start → partial → output → complete', async () => {
    const progressEvents = [];
    const onProgress = vi.fn((event) => progressEvents.push(event));

    const chunks = [];
    for await (const partial of streamingMap(['a', 'b'], 'transform', {
      batchSize: 2,
      onProgress,
    })) {
      chunks.push(partial);
    }

    expect(chunks.length).toBeGreaterThan(0);
    const stepEvents = progressEvents.filter((e) => e.step === 'streaming-map');
    const eventNames = stepEvents.map((e) => e.event);

    expect(eventNames[0]).toBe(ChainEvent.start);
    expect(eventNames).toContain(DomainEvent.input);
    expect(eventNames).toContain(DomainEvent.partial);
    expect(eventNames).toContain(DomainEvent.output);
    expect(eventNames[eventNames.length - 1]).toBe(ChainEvent.complete);
  });

  it('complete event reports batch and item counts', async () => {
    const progressEvents = [];
    const onProgress = vi.fn((event) => progressEvents.push(event));

    const chunks = [];
    for await (const partial of streamingMap(['a', 'b', 'c'], 'transform', {
      batchSize: 2,
      onProgress,
    })) {
      chunks.push(partial);
    }

    expect(chunks.length).toBeGreaterThan(0);
    const completeEvent = progressEvents.find(
      (e) => e.step === 'streaming-map' && e.event === ChainEvent.complete
    );
    expect(completeEvent).toBeDefined();
    expect(completeEvent.totalItems).toBe(3);
    expect(completeEvent.totalBatches).toBe(2);
    expect(completeEvent.successCount).toBe(3);
    expect(completeEvent.failedItems).toBe(0);
    expect(completeEvent.outcome).toBe('success');
  });
});
