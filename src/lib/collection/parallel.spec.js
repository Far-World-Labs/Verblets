import { describe, expect, it, vi } from 'vitest';
import { map, filter, find, reduce, group } from './parallel.js';

describe('parallel collection utilities', () => {
  describe('map', () => {
    it('applies fn to each item with results in input order', async () => {
      const fn = vi.fn(async (item) => item * 2);

      const result = await map(fn, [1, 2, 3]);

      expect(result).toEqual([2, 4, 6]);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('returns empty array for empty input', async () => {
      const result = await map(vi.fn(), []);
      expect(result).toEqual([]);
    });

    it('returns empty array for undefined input', async () => {
      const result = await map(vi.fn(), undefined);
      expect(result).toEqual([]);
    });

    it('processes in chunks controlled by maxParallel', async () => {
      const callOrder = [];
      const fn = vi.fn(async (item) => {
        callOrder.push(item);
        return item;
      });

      await map(fn, [1, 2, 3, 4, 5], { maxParallel: 2 });

      // First chunk: [1, 2], then [3, 4], then [5]
      expect(fn).toHaveBeenCalledTimes(5);
    });

    it('emits undefined for failed slots in resilient mode', async () => {
      const fn = vi.fn(async (item) => {
        if (item === 2) throw new Error('fail');
        return item * 10;
      });

      const result = await map(fn, [1, 2, 3], { errorPosture: 'resilient' });

      expect(result).toEqual([10, undefined, 30]);
    });

    it('throws on first error in strict mode', async () => {
      const fn = vi.fn(async (item) => {
        if (item === 2) throw new Error('strict-fail');
        return item;
      });

      await expect(map(fn, [1, 2, 3], { errorPosture: 'strict' })).rejects.toThrow('strict-fail');
    });

    it('passes index as second argument', async () => {
      const fn = vi.fn(async (item, idx) => `${item}-${idx}`);

      const result = await map(fn, ['a', 'b', 'c']);

      expect(result).toEqual(['a-0', 'b-1', 'c-2']);
    });

    it('respects abortSignal', async () => {
      const controller = new AbortController();
      controller.abort(new Error('aborted'));

      await expect(map(vi.fn(), [1, 2, 3], { abortSignal: controller.signal })).rejects.toThrow(
        'aborted'
      );
    });
  });

  describe('filter', () => {
    it('keeps items where fn returns truthy', async () => {
      const fn = vi.fn(async (item) => item > 2);

      const result = await filter(fn, [1, 2, 3, 4]);

      expect(result).toEqual([3, 4]);
    });

    it('returns empty array when nothing matches', async () => {
      const result = await filter(async () => false, [1, 2, 3]);
      expect(result).toEqual([]);
    });

    it('returns empty array for empty input', async () => {
      const result = await filter(vi.fn(), []);
      expect(result).toEqual([]);
    });

    it('treats error as false in resilient mode', async () => {
      const fn = vi.fn(async (item) => {
        if (item === 2) throw new Error('fail');
        return true;
      });

      const result = await filter(fn, [1, 2, 3], { errorPosture: 'resilient' });

      expect(result).toEqual([1, 3]);
    });
  });

  describe('find', () => {
    it('returns first matching item', async () => {
      const fn = vi.fn(async (item) => item > 2);

      const result = await find(fn, [1, 2, 3, 4]);

      expect(result).toBe(3);
    });

    it('returns undefined when nothing matches', async () => {
      const result = await find(async () => false, [1, 2, 3]);
      expect(result).toBeUndefined();
    });

    it('returns undefined for empty input', async () => {
      const result = await find(vi.fn(), []);
      expect(result).toBeUndefined();
    });

    it('stops processing after finding a match within a chunk', async () => {
      const fn = vi.fn(async (item) => item === 2);

      const result = await find(fn, [1, 2, 3, 4, 5], { maxParallel: 2 });

      // Processes chunk [1, 2] — finds match, stops before [3, 4]
      expect(result).toBe(2);
      // Only the first chunk's items should be called
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('reduce', () => {
    it('accumulates across items', async () => {
      const fn = vi.fn(async (acc, item) => acc + item);

      const result = await reduce(fn, [1, 2, 3], 0);

      expect(result).toBe(6);
    });

    it('returns initial value for empty array', async () => {
      const result = await reduce(vi.fn(), [], 'init');
      expect(result).toBe('init');
    });

    it('passes index as third argument', async () => {
      const fn = vi.fn(async (acc, item, idx) => [...acc, `${item}-${idx}`]);

      const result = await reduce(fn, ['a', 'b'], []);

      expect(result).toEqual(['a-0', 'b-1']);
    });
  });

  describe('group', () => {
    it('partitions items by key', async () => {
      const fn = vi.fn(async (item) => (item % 2 === 0 ? 'even' : 'odd'));

      const result = await group(fn, [1, 2, 3, 4]);

      expect(result).toEqual({ odd: [1, 3], even: [2, 4] });
    });

    it('returns empty object for empty input', async () => {
      const result = await group(vi.fn(), []);
      expect(result).toEqual({});
    });

    it('uses "other" for undefined keys', async () => {
      const fn = vi.fn(async () => undefined);

      const result = await group(fn, ['a', 'b']);

      expect(result).toEqual({ other: ['a', 'b'] });
    });

    it('uses "other" for error keys in resilient mode', async () => {
      const fn = vi.fn(async (item) => {
        if (item === 'bad') throw new Error('fail');
        return 'good';
      });

      const result = await group(fn, ['ok', 'bad'], { errorPosture: 'resilient' });

      expect(result).toEqual({ good: ['ok'], other: ['bad'] });
    });
  });
});
