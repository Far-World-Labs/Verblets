import { describe, it, expect } from 'vitest';

import combinations, { rangeCombinations } from './index.js';

describe('combinations', () => {
  it('generates pairwise combinations', () => {
    const result = combinations(['a', 'b', 'c'], 2);
    expect(result).toStrictEqual([
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ]);
  });

  it('generates triples', () => {
    const result = combinations([1, 2, 3, 4], 3);
    expect(result).toStrictEqual([
      [1, 2, 3],
      [1, 2, 4],
      [1, 3, 4],
      [2, 3, 4],
    ]);
  });

  it('generates single-element combinations', () => {
    const result = combinations(['x', 'y', 'z'], 1);
    expect(result).toStrictEqual([['x'], ['y'], ['z']]);
  });

  it('returns single combination when size equals array length', () => {
    const result = combinations([1, 2, 3], 3);
    expect(result).toStrictEqual([[1, 2, 3]]);
  });

  it('returns empty array when size exceeds array length', () => {
    const result = combinations([1, 2], 5);
    expect(result).toStrictEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(combinations([], 2)).toStrictEqual([]);
  });

  it('returns empty array for size 0', () => {
    expect(combinations([1, 2, 3], 0)).toStrictEqual([]);
  });

  it('returns empty array for non-array input', () => {
    expect(combinations('not-array', 2)).toStrictEqual([]);
  });

  it('defaults size to 2', () => {
    const result = combinations(['a', 'b', 'c']);
    expect(result).toStrictEqual([
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ]);
  });
});

describe('rangeCombinations', () => {
  it('generates combinations of varying sizes', () => {
    const result = rangeCombinations(['a', 'b', 'c']);
    expect(result).toStrictEqual([
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
      ['a', 'b', 'c'],
    ]);
  });

  it('respects minSize parameter', () => {
    const result = rangeCombinations([1, 2, 3], 3);
    expect(result).toStrictEqual([[1, 2, 3]]);
  });

  it('respects maxSize parameter', () => {
    const result = rangeCombinations([1, 2, 3, 4], 2, 2);
    expect(result).toStrictEqual([
      [1, 2],
      [1, 3],
      [1, 4],
      [2, 3],
      [2, 4],
      [3, 4],
    ]);
  });

  it('returns empty array for non-array input', () => {
    expect(rangeCombinations(null)).toStrictEqual([]);
  });

  it('caps maxSize at array length', () => {
    const withCap = rangeCombinations([1, 2], 1, 100);
    const withoutCap = rangeCombinations([1, 2], 1, 2);
    expect(withCap).toStrictEqual(withoutCap);
  });
});
