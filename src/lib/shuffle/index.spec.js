import { describe, expect, it } from 'vitest';

import shuffle from './index.js';

describe('shuffle', () => {
  it('returns an array with the same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
    expect(result.toSorted()).toEqual(input.toSorted());
  });

  it('returns a new array by default (not in-place)', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).not.toBe(input);
  });

  it('shuffles in-place when inPlace is true', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input, true);
    expect(result).toBe(input);
  });

  it('handles an empty array', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('handles a single-element array', () => {
    expect(shuffle([42])).toEqual([42]);
  });

  it('eventually produces a different order (statistical)', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    // Run 10 shuffles; at least one should differ from the original order
    const results = Array.from({ length: 10 }, () => shuffle(input));
    const anyDifferent = results.some((r) => r.some((val, i) => val !== input[i]));
    expect(anyDifferent).toBe(true);
  });
});
