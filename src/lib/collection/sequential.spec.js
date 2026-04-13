import { describe, expect, it, vi } from 'vitest';
import { map, filter, find, reduce, group } from './sequential.js';

describe('sequential collection utilities', () => {
  describe('map', () => {
    it('applies fn to each item one at a time', async () => {
      const callOrder = [];
      const fn = vi.fn(async (item) => {
        callOrder.push(item);
        return item * 2;
      });

      const result = await map(fn, [1, 2, 3]);

      expect(result).toEqual([2, 4, 6]);
      expect(callOrder).toEqual([1, 2, 3]);
    });

    it('returns empty array for empty input', async () => {
      const result = await map(vi.fn(), []);
      expect(result).toEqual([]);
    });

    it('passes index as second argument', async () => {
      const fn = vi.fn(async (item, idx) => `${item}-${idx}`);

      const result = await map(fn, ['a', 'b']);

      expect(result).toEqual(['a-0', 'b-1']);
    });

    it('respects abortSignal', async () => {
      const controller = new AbortController();
      controller.abort(new Error('aborted'));

      await expect(map(vi.fn(), [1, 2], { abortSignal: controller.signal })).rejects.toThrow(
        'aborted'
      );
    });
  });

  describe('filter', () => {
    it('keeps items where fn returns truthy', async () => {
      const result = await filter(async (item) => item > 2, [1, 2, 3, 4]);

      expect(result).toEqual([3, 4]);
    });

    it('returns empty array for empty input', async () => {
      const result = await filter(vi.fn(), []);
      expect(result).toEqual([]);
    });

    it('processes items sequentially', async () => {
      const callOrder = [];
      const fn = async (item) => {
        callOrder.push(item);
        return item % 2 === 0;
      };

      await filter(fn, [1, 2, 3, 4]);

      expect(callOrder).toEqual([1, 2, 3, 4]);
    });
  });

  describe('find', () => {
    it('returns first matching item', async () => {
      const result = await find(async (item) => item > 2, [1, 2, 3, 4]);

      expect(result).toBe(3);
    });

    it('returns undefined when nothing matches', async () => {
      const result = await find(async () => false, [1, 2, 3]);
      expect(result).toBeUndefined();
    });

    it('stops after first match (early termination)', async () => {
      const fn = vi.fn(async (item) => item === 2);

      const result = await find(fn, [1, 2, 3, 4]);

      expect(result).toBe(2);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('returns undefined for empty input', async () => {
      const result = await find(vi.fn(), []);
      expect(result).toBeUndefined();
    });
  });

  describe('reduce', () => {
    it('accumulates across items sequentially', async () => {
      const result = await reduce(async (acc, item) => acc + item, [1, 2, 3], 0);

      expect(result).toBe(6);
    });

    it('passes index as third argument', async () => {
      const result = await reduce(async (acc, item, idx) => [...acc, idx], ['a', 'b', 'c'], []);

      expect(result).toEqual([0, 1, 2]);
    });
  });

  describe('group', () => {
    it('partitions items by key', async () => {
      const result = await group(async (item) => (item > 2 ? 'high' : 'low'), [1, 2, 3, 4]);

      expect(result).toEqual({ low: [1, 2], high: [3, 4] });
    });

    it('returns empty object for empty input', async () => {
      const result = await group(vi.fn(), []);
      expect(result).toEqual({});
    });

    it('uses "other" for undefined/null keys', async () => {
      const result = await group(async () => undefined, ['a', 'b']);

      expect(result).toEqual({ other: ['a', 'b'] });
    });
  });
});
