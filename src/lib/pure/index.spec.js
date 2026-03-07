import { describe, expect, it } from 'vitest';

import { last, omit, chunk, unionBy } from './index.js';

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
