import { describe, expect, it } from 'vitest';

import parallelBatch, { parallelMap } from './index.js';
import { ErrorPosture } from '../progress/constants.js';

describe('parallelBatch', () => {
  it('processes all items and returns results in order', async () => {
    const items = [1, 2, 3, 4, 5];
    const result = await parallelBatch(items, async (x) => x * 2);
    expect(result).toEqual([2, 4, 6, 8, 10]);
  });

  it('passes item index to processor', async () => {
    const items = ['a', 'b', 'c'];
    const result = await parallelBatch(items, async (item, index) => `${index}:${item}`);
    expect(result).toEqual(['0:a', '1:b', '2:c']);
  });

  it('respects maxParallel concurrency limit', async () => {
    let maxConcurrent = 0;
    let current = 0;

    const items = [1, 2, 3, 4, 5, 6];
    await parallelBatch(
      items,
      async (x) => {
        current++;
        maxConcurrent = Math.max(maxConcurrent, current);
        await new Promise((r) => setTimeout(r, 10));
        current--;
        return x;
      },
      { maxParallel: 2 }
    );

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it('returns empty array for empty input', async () => {
    const result = await parallelBatch([], async (x) => x);
    expect(result).toEqual([]);
  });

  it('returns empty array for non-array input', async () => {
    const result = await parallelBatch(null, async (x) => x);
    expect(result).toEqual([]);
  });

  it('defaults maxParallel to 3', async () => {
    let maxConcurrent = 0;
    let current = 0;

    const items = Array.from({ length: 9 }, (_, i) => i);
    await parallelBatch(items, async (x) => {
      current++;
      maxConcurrent = Math.max(maxConcurrent, current);
      await new Promise((r) => setTimeout(r, 10));
      current--;
      return x;
    });

    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });

  it('handles single item', async () => {
    const result = await parallelBatch([42], async (x) => x + 1);
    expect(result).toEqual([43]);
  });

  it('exports parallelMap as alias', () => {
    expect(parallelMap).toBe(parallelBatch);
  });

  describe('errorPosture', () => {
    it('throws on first error in strict mode', async () => {
      const items = [1, 2, 3];
      await expect(
        parallelBatch(
          items,
          async (x) => {
            if (x === 2) throw new Error('strict-fail');
            return x;
          },
          { maxParallel: 3, errorPosture: ErrorPosture.strict }
        )
      ).rejects.toThrow('strict-fail');
    });

    it('continues in resilient mode and fills undefined for failures', async () => {
      const items = [1, 2, 3, 4];
      const result = await parallelBatch(
        items,
        async (x) => {
          if (x === 2 || x === 4) throw new Error('resilient-fail');
          return x * 10;
        },
        { maxParallel: 4, errorPosture: ErrorPosture.resilient }
      );
      expect(result).toEqual([10, undefined, 30, undefined]);
    });
  });

  describe('abortSignal', () => {
    it('aborts between batch groups', async () => {
      const controller = new AbortController();
      const processed = [];

      const items = [1, 2, 3, 4, 5, 6];
      await expect(
        parallelBatch(
          items,
          async (x) => {
            processed.push(x);
            if (x >= 2) controller.abort(new Error('user abort'));
            return x;
          },
          { maxParallel: 2, abortSignal: controller.signal }
        )
      ).rejects.toThrow('user abort');

      expect(processed).toEqual([1, 2]);
    });

    it('throws default abort error when no reason provided', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        parallelBatch([1], async (x) => x, { abortSignal: controller.signal })
      ).rejects.toThrow(/operation was aborted/i);
    });
  });

  describe('adaptive concurrency', () => {
    it('uses fixed concurrency path when minParallel is not set', async () => {
      let maxConcurrent = 0;
      let current = 0;

      const items = Array.from({ length: 12 }, (_, i) => i);
      const result = await parallelBatch(
        items,
        async (x) => {
          current++;
          maxConcurrent = Math.max(maxConcurrent, current);
          await new Promise((r) => setTimeout(r, 5));
          current--;
          return x * 2;
        },
        { maxParallel: 4 }
      );

      expect(result).toEqual(items.map((x) => x * 2));
      expect(maxConcurrent).toBeLessThanOrEqual(4);
    });

    it('uses fixed concurrency path when minParallel equals maxParallel', async () => {
      let maxConcurrent = 0;
      let current = 0;

      const items = Array.from({ length: 6 }, (_, i) => i);
      const result = await parallelBatch(
        items,
        async (x) => {
          current++;
          maxConcurrent = Math.max(maxConcurrent, current);
          await new Promise((r) => setTimeout(r, 5));
          current--;
          return x;
        },
        { maxParallel: 3, minParallel: 3 }
      );

      expect(result).toEqual(items);
      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it('maintains result order with adaptive concurrency', async () => {
      const items = Array.from({ length: 15 }, (_, i) => i);
      const result = await parallelBatch(items, async (x) => x * 3, {
        minParallel: 1,
        maxParallel: 5,
        latencyThreshold: 50000,
        errorThreshold: 0.5,
      });

      expect(result).toEqual(items.map((x) => x * 3));
    });

    it('passes correct indices across variable-sized batches', async () => {
      const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const result = await parallelBatch(items, async (item, index) => `${index}:${item}`, {
        minParallel: 1,
        maxParallel: 4,
        latencyThreshold: 50000,
        errorThreshold: 0.5,
      });

      expect(result).toEqual(['0:a', '1:b', '2:c', '3:d', '4:e', '5:f', '6:g', '7:h']);
    });

    it('stays at maxParallel when latency and errors are low', async () => {
      let maxConcurrent = 0;
      let current = 0;

      const items = Array.from({ length: 15 }, (_, i) => i);
      await parallelBatch(
        items,
        async (x) => {
          current++;
          maxConcurrent = Math.max(maxConcurrent, current);
          await new Promise((r) => setTimeout(r, 1));
          current--;
          return x;
        },
        {
          minParallel: 1,
          maxParallel: 5,
          latencyThreshold: 50000,
          errorThreshold: 0.5,
        }
      );

      expect(maxConcurrent).toBe(5);
    });

    it('decreases concurrency when latency exceeds threshold', async () => {
      const batchConcurrencies = [];
      let inFlight = 0;
      let batchPeak = 0;

      const items = Array.from({ length: 20 }, (_, i) => i);
      await parallelBatch(
        items,
        async (x) => {
          inFlight++;
          batchPeak = Math.max(batchPeak, inFlight);
          await new Promise((r) => setTimeout(r, 50));
          inFlight--;
          if (inFlight === 0) {
            batchConcurrencies.push(batchPeak);
            batchPeak = 0;
          }
          return x;
        },
        {
          minParallel: 1,
          maxParallel: 5,
          latencyThreshold: 1,
          errorThreshold: 0.5,
        }
      );

      expect(batchConcurrencies[0]).toBe(5);
      const laterBatches = batchConcurrencies.slice(2);
      expect(laterBatches.every((c) => c < 5)).toBe(true);
    });

    it('decreases concurrency when error rate exceeds threshold', async () => {
      const batchConcurrencies = [];
      let inFlight = 0;
      let batchPeak = 0;

      const items = Array.from({ length: 20 }, (_, i) => i);
      await parallelBatch(
        items,
        async (x) => {
          inFlight++;
          batchPeak = Math.max(batchPeak, inFlight);
          await new Promise((r) => setTimeout(r, 1));
          inFlight--;
          if (inFlight === 0) {
            batchConcurrencies.push(batchPeak);
            batchPeak = 0;
          }
          if (x % 2 === 0) throw new Error(`fail-${x}`);
          return x;
        },
        {
          minParallel: 1,
          maxParallel: 5,
          latencyThreshold: 50000,
          errorThreshold: 0.3,
          errorPosture: ErrorPosture.resilient,
        }
      );

      expect(batchConcurrencies[0]).toBe(5);
      expect(batchConcurrencies.some((c) => c < 5)).toBe(true);
    });

    it('recovers concurrency when conditions improve', async () => {
      const batchConcurrencies = [];
      let inFlight = 0;
      let batchPeak = 0;

      const items = Array.from({ length: 30 }, (_, i) => i);
      await parallelBatch(
        items,
        async (x) => {
          inFlight++;
          batchPeak = Math.max(batchPeak, inFlight);
          const delay = x < 10 ? 100 : 1;
          await new Promise((r) => setTimeout(r, delay));
          inFlight--;
          if (inFlight === 0) {
            batchConcurrencies.push(batchPeak);
            batchPeak = 0;
          }
          return x;
        },
        {
          minParallel: 1,
          maxParallel: 5,
          latencyThreshold: 50,
          errorThreshold: 0.5,
        }
      );

      const minConcurrency = Math.min(...batchConcurrencies);
      expect(minConcurrency).toBeLessThan(5);

      const troughIndex = batchConcurrencies.indexOf(minConcurrency);
      const afterTrough = batchConcurrencies.slice(troughIndex + 1);
      expect(afterTrough.some((c) => c > minConcurrency)).toBe(true);
    });

    it('respects strict errorPosture under adaptive concurrency', async () => {
      const items = [1, 2, 3, 4, 5];
      await expect(
        parallelBatch(
          items,
          async (x) => {
            if (x === 3) throw new Error('adaptive-strict-fail');
            return x;
          },
          {
            minParallel: 1,
            maxParallel: 3,
            errorPosture: ErrorPosture.strict,
          }
        )
      ).rejects.toThrow('adaptive-strict-fail');
    });

    it('respects resilient errorPosture under adaptive concurrency', async () => {
      const items = [1, 2, 3, 4, 5];
      const result = await parallelBatch(
        items,
        async (x) => {
          if (x % 2 === 0) throw new Error('adaptive-resilient-fail');
          return x * 10;
        },
        {
          minParallel: 1,
          maxParallel: 3,
          errorPosture: ErrorPosture.resilient,
        }
      );

      expect(result).toEqual([10, undefined, 30, undefined, 50]);
    });

    it('respects abortSignal under adaptive concurrency', async () => {
      const controller = new AbortController();
      const processed = [];

      const items = [1, 2, 3, 4, 5, 6, 7, 8];
      await expect(
        parallelBatch(
          items,
          async (x) => {
            processed.push(x);
            if (x >= 2) controller.abort(new Error('adaptive abort'));
            return x;
          },
          {
            minParallel: 1,
            maxParallel: 2,
            abortSignal: controller.signal,
          }
        )
      ).rejects.toThrow('adaptive abort');

      expect(processed).toEqual([1, 2]);
    });

    it('never exceeds maxParallel bound', async () => {
      let maxConcurrent = 0;
      let current = 0;

      const items = Array.from({ length: 20 }, (_, i) => i);
      await parallelBatch(
        items,
        async (x) => {
          current++;
          maxConcurrent = Math.max(maxConcurrent, current);
          await new Promise((r) => setTimeout(r, 1));
          current--;
          return x;
        },
        {
          minParallel: 1,
          maxParallel: 4,
          latencyThreshold: 50000,
          errorThreshold: 0.5,
        }
      );

      expect(maxConcurrent).toBeLessThanOrEqual(4);
    });

    it('never goes below minParallel bound', async () => {
      const batchConcurrencies = [];
      let inFlight = 0;
      let batchPeak = 0;

      const items = Array.from({ length: 20 }, (_, i) => i);
      await parallelBatch(
        items,
        async (x) => {
          inFlight++;
          batchPeak = Math.max(batchPeak, inFlight);
          await new Promise((r) => setTimeout(r, 50));
          inFlight--;
          if (inFlight === 0) {
            batchConcurrencies.push(batchPeak);
            batchPeak = 0;
          }
          return x;
        },
        {
          minParallel: 2,
          maxParallel: 5,
          latencyThreshold: 1,
          errorThreshold: 0.5,
        }
      );

      batchConcurrencies.forEach((c) => expect(c).toBeGreaterThanOrEqual(2));
    });

    it('clamps minParallel to at least 1', async () => {
      let maxConcurrent = 0;
      let current = 0;

      const items = Array.from({ length: 10 }, (_, i) => i);
      const result = await parallelBatch(
        items,
        async (x) => {
          current++;
          maxConcurrent = Math.max(maxConcurrent, current);
          await new Promise((r) => setTimeout(r, 50));
          current--;
          return x;
        },
        {
          minParallel: 0,
          maxParallel: 3,
          latencyThreshold: 1,
          errorThreshold: 0.5,
        }
      );

      expect(result).toEqual(items);
      expect(maxConcurrent).toBeGreaterThanOrEqual(1);
    });
  });
});
