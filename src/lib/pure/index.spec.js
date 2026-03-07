import { describe, expect, it } from 'vitest';

import { last, compact, pick, omit, chunk, unionBy, zipWith } from './index.js';

describe('last', () => {
  it('returns the last element of an array', () => {
    expect(last([1, 2, 3])).toBe(3);
  });

  it('returns undefined for an empty array', () => {
    expect(last([])).toBeUndefined();
  });

  it('returns the only element of a single-item array', () => {
    expect(last(['a'])).toBe('a');
  });
});

describe('compact', () => {
  it('removes null and undefined from an array', () => {
    expect(compact([1, null, 2, undefined, 3])).toEqual([1, 2, 3]);
  });

  it('preserves falsy values that are not null/undefined', () => {
    expect(compact([0, '', false, null, undefined])).toEqual([0, '', false]);
  });

  it('returns empty array for all-null input', () => {
    expect(compact([null, undefined])).toEqual([]);
  });

  it('returns same elements for array with no nullish values', () => {
    expect(compact([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('handles empty array', () => {
    expect(compact([])).toEqual([]);
  });
});

describe('pick', () => {
  it('keeps only specified keys', () => {
    expect(pick(['a', 'c'])({ a: 1, b: 2, c: 3 })).toEqual({ a: 1, c: 3 });
  });

  it('returns empty object when no keys match', () => {
    expect(pick(['z'])({ a: 1, b: 2 })).toEqual({});
  });

  it('accepts a Set of keys', () => {
    expect(pick(new Set(['b']))({ a: 1, b: 2, c: 3 })).toEqual({ b: 2 });
  });

  it('is curried', () => {
    const pickName = pick(['name']);
    expect(pickName({ id: 1, name: 'Alice' })).toEqual({ name: 'Alice' });
    expect(pickName({ id: 2, name: 'Bob', age: 30 })).toEqual({ name: 'Bob' });
  });
});

describe('omit', () => {
  it('removes specified keys from an object', () => {
    expect(omit(['b'])({ a: 1, b: 2, c: 3 })).toEqual({ a: 1, c: 3 });
  });

  it('returns all keys when none are omitted', () => {
    expect(omit([])({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it('handles keys that do not exist', () => {
    expect(omit(['z'])({ a: 1 })).toEqual({ a: 1 });
  });

  it('accepts a Set of keys', () => {
    expect(omit(new Set(['a']))({ a: 1, b: 2 })).toEqual({ b: 2 });
  });

  it('is curried', () => {
    const omitId = omit(['id']);
    expect(omitId({ id: 1, name: 'Alice' })).toEqual({ name: 'Alice' });
    expect(omitId({ id: 2, name: 'Bob' })).toEqual({ name: 'Bob' });
  });
});

describe('chunk', () => {
  it('splits an array into chunks of the given size', () => {
    expect(chunk(2)([1, 2, 3, 4, 5])).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns a single chunk when size >= array length', () => {
    expect(chunk(10)([1, 2, 3])).toEqual([[1, 2, 3]]);
  });

  it('returns an empty array for empty input', () => {
    expect(chunk(3)([])).toEqual([]);
  });

  it('handles chunk size of 1', () => {
    expect(chunk(1)([1, 2, 3])).toEqual([[1], [2], [3]]);
  });

  it('is curried', () => {
    const chunkBy3 = chunk(3);
    expect(chunkBy3([1, 2, 3, 4])).toEqual([[1, 2, 3], [4]]);
  });
});

describe('unionBy', () => {
  it('merges arrays, deduplicating by key function', () => {
    const byId = unionBy((x) => x.id);
    const existing = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ];
    const incoming = [
      { id: 2, name: 'b2' },
      { id: 3, name: 'c' },
    ];
    const result = byId(existing, incoming);
    expect(result).toHaveLength(3);
    expect(result[2]).toEqual({ id: 3, name: 'c' });
  });

  it('preserves existing items over incoming duplicates', () => {
    const byId = unionBy((x) => x.id);
    const existing = [{ id: 1, name: 'original' }];
    const incoming = [{ id: 1, name: 'duplicate' }];
    const result = byId(existing, incoming);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('original');
  });

  it('returns existing when incoming is empty', () => {
    const byId = unionBy((x) => x);
    expect(byId([1, 2], [])).toEqual([1, 2]);
  });

  it('returns incoming when existing is empty', () => {
    const byId = unionBy((x) => x);
    expect(byId([], [3, 4])).toEqual([3, 4]);
  });
});

describe('zipWith', () => {
  it('combines two arrays element-wise', () => {
    const add = zipWith((a, b) => a + b);
    expect(add([1, 2, 3], [10, 20, 30])).toEqual([11, 22, 33]);
  });

  it('passes index as third argument', () => {
    const withIndex = zipWith((a, b, i) => `${i}:${a}+${b}`);
    expect(withIndex(['a', 'b'], ['x', 'y'])).toEqual(['0:a+x', '1:b+y']);
  });

  it('handles arrays of different lengths (truncates to first)', () => {
    const pair = zipWith((a, b) => [a, b]);
    expect(pair([1, 2], [10, 20, 30])).toEqual([
      [1, 10],
      [2, 20],
    ]);
  });

  it('is curried', () => {
    const merge = zipWith((item, score) => ({ item, score }));
    expect(merge(['a', 'b'], [0.9, 0.3])).toEqual([
      { item: 'a', score: 0.9 },
      { item: 'b', score: 0.3 },
    ]);
  });

  it('handles empty arrays', () => {
    const add = zipWith((a, b) => a + b);
    expect(add([], [])).toEqual([]);
  });
});
