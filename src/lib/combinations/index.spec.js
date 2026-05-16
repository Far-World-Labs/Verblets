import { describe, expect, it } from 'vitest';
import combinations, { rangeCombinations } from './index.js';
import { runTable } from '../examples-runner/index.js';

runTable({
  describe: 'combinations',
  examples: [
    {
      name: 'pairwise combinations',
      inputs: { items: ['a', 'b', 'c'], size: 2 },
      want: {
        value: [
          ['a', 'b'],
          ['a', 'c'],
          ['b', 'c'],
        ],
      },
    },
    {
      name: 'triples',
      inputs: { items: [1, 2, 3, 4], size: 3 },
      want: {
        value: [
          [1, 2, 3],
          [1, 2, 4],
          [1, 3, 4],
          [2, 3, 4],
        ],
      },
    },
    {
      name: 'single-element combinations',
      inputs: { items: ['x', 'y', 'z'], size: 1 },
      want: { value: [['x'], ['y'], ['z']] },
    },
    {
      name: 'size equals array length → single combination',
      inputs: { items: [1, 2, 3], size: 3 },
      want: { value: [[1, 2, 3]] },
    },
    {
      name: 'size exceeds array length → empty',
      inputs: { items: [1, 2], size: 5 },
      want: { value: [] },
    },
    { name: 'empty input → empty', inputs: { items: [], size: 2 }, want: { value: [] } },
    { name: 'size 0 → empty', inputs: { items: [1, 2, 3], size: 0 }, want: { value: [] } },
    {
      name: 'non-array input → empty',
      inputs: { items: 'not-array', size: 2 },
      want: { value: [] },
    },
    {
      name: 'defaults size to 2',
      inputs: { items: ['a', 'b', 'c'], size: undefined },
      want: {
        value: [
          ['a', 'b'],
          ['a', 'c'],
          ['b', 'c'],
        ],
      },
    },
  ],
  process: ({ inputs }) => combinations(inputs.items, inputs.size),
  expects: ({ result, want }) => expect(result).toEqual(want.value),
});

runTable({
  describe: 'rangeCombinations',
  examples: [
    {
      name: 'all sizes ≥ default minSize',
      inputs: { items: ['a', 'b', 'c'] },
      want: {
        value: [
          ['a', 'b'],
          ['a', 'c'],
          ['b', 'c'],
          ['a', 'b', 'c'],
        ],
      },
    },
    {
      name: 'respects minSize',
      inputs: { items: [1, 2, 3], minSize: 3 },
      want: { value: [[1, 2, 3]] },
    },
    {
      name: 'respects maxSize',
      inputs: { items: [1, 2, 3, 4], minSize: 2, maxSize: 2 },
      want: {
        value: [
          [1, 2],
          [1, 3],
          [1, 4],
          [2, 3],
          [2, 4],
          [3, 4],
        ],
      },
    },
    { name: 'non-array input → empty', inputs: { items: null }, want: { value: [] } },
  ],
  process: ({ inputs }) => rangeCombinations(inputs.items, inputs.minSize, inputs.maxSize),
  expects: ({ result, want }) => expect(result).toEqual(want.value),
});

// `caps maxSize at array length` is a relational assertion (one call vs
// another), not a literal want — kept as a focused imperative check.
describe('rangeCombinations: maxSize cap', () => {
  it('caps maxSize at array length', () => {
    const withCap = rangeCombinations([1, 2], 1, 100);
    const withoutCap = rangeCombinations([1, 2], 1, 2);
    expect(withCap).toStrictEqual(withoutCap);
  });
});
