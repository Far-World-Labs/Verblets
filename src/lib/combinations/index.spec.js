import { describe, it, expect } from 'vitest';
import combinations, { rangeCombinations } from './index.js';

describe('combinations helper', () => {
  it('generates pairwise combinations', () => {
    const result = combinations(['a', 'b', 'c'], 2);
    expect(result).toStrictEqual([
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ]);
  });

  it('generates combinations of varying sizes', () => {
    const result = rangeCombinations(['a', 'b', 'c']);
    expect(result).toStrictEqual([
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
      ['a', 'b', 'c'],
    ]);
  });
});
