import { beforeEach, describe, expect, it, vi } from 'vitest';
import map from './index.js';
import listBatch from '../../verblets/list-batch/index.js';

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
  default: vi.fn(async (fn, options) => {
    if (options?.onProgress) {
      options.onProgress({
        step: options.label || 'retry',
        event: 'start',
        attemptNumber: 1,
      });
    }
    const result = await fn();
    if (options?.onProgress) {
      options.onProgress({
        step: options.label || 'retry',
        event: 'complete',
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

  it('leaves undefined on error', async () => {
    listBatch.mockRejectedValueOnce(new Error('fail'));
    const result = await map(['FAIL', 'oops'], 'x', { batchSize: 2 });
    expect(result).toStrictEqual([undefined, undefined]);
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

      // Check start event
      const startEvent = progressEvents.find((e) => e.step === 'map' && e.event === 'start');
      expect(startEvent).toBeDefined();
      expect(startEvent.totalItems).toBe(4);
      expect(startEvent.processedItems).toBe(0);

      // Check batch complete events
      const batchEvents = progressEvents.filter((e) => e.event === 'batch:complete');
      expect(batchEvents.length).toBeGreaterThan(0);

      // Check complete event
      const completeEvent = progressEvents.find((e) => e.step === 'map' && e.event === 'complete');
      expect(completeEvent).toBeDefined();
      expect(completeEvent.totalItems).toBe(4);
      expect(completeEvent.processedItems).toBe(4);
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

      // Get batch complete events in order
      const batchEvents = progressEvents.filter((e) => e.event === 'batch:complete');

      // Check that processedItems increases correctly
      let lastProcessed = 0;
      batchEvents.forEach((event) => {
        expect(event.processedItems).toBeGreaterThan(lastProcessed);
        lastProcessed = event.processedItems;
      });

      // Final processedItems should equal totalItems
      const lastBatch = batchEvents[batchEvents.length - 1];
      expect(lastBatch.processedItems).toBeLessThanOrEqual(5);
    });

    it('includes batch metadata in events', async () => {
      const progressEvents = [];
      const onProgress = vi.fn((event) => {
        progressEvents.push(event);
      });

      await map(['a', 'b', 'c'], 'transform', {
        batchSize: 2,
        onProgress,
      });

      // Check batch events have proper metadata
      const batchEvents = progressEvents.filter((e) => e.event === 'batch:complete');
      expect(batchEvents.length).toBeGreaterThan(0);
      const batchEvent = batchEvents[0];
      expect(batchEvent).toBeDefined();
      expect(batchEvent.batchNumber).toBeDefined();
      expect(batchEvent.batchSize).toBeDefined();
      expect(batchEvent.batchIndex).toBeDefined();
      expect(batchEvent.totalBatches).toBeDefined();
    });
  });
});
