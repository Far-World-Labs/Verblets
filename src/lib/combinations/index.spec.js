import combinations, { rangeCombinations } from './index.js';
import { runTable } from '../examples-runner/index.js';

const combinationsExamples = [
  {
    name: 'pairwise combinations',
    inputs: { items: ['a', 'b', 'c'], size: 2 },
    want: [
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ],
  },
  {
    name: 'triples',
    inputs: { items: [1, 2, 3, 4], size: 3 },
    want: [
      [1, 2, 3],
      [1, 2, 4],
      [1, 3, 4],
      [2, 3, 4],
    ],
  },
  {
    name: 'single-element combinations',
    inputs: { items: ['x', 'y', 'z'], size: 1 },
    want: [['x'], ['y'], ['z']],
  },
  {
    name: 'size equals array length → single combination',
    inputs: { items: [1, 2, 3], size: 3 },
    want: [[1, 2, 3]],
  },
  { name: 'size exceeds array length → empty', inputs: { items: [1, 2], size: 5 }, want: [] },
  { name: 'empty input → empty', inputs: { items: [], size: 2 }, want: [] },
  { name: 'size 0 → empty', inputs: { items: [1, 2, 3], size: 0 }, want: [] },
  { name: 'non-array input → empty', inputs: { items: 'not-array', size: 2 }, want: [] },
  {
    name: 'defaults size to 2',
    inputs: { items: ['a', 'b', 'c'], size: undefined },
    want: [
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ],
  },
];

runTable({
  describe: 'combinations',
  examples: combinationsExamples,
  process: ({ items, size }) => combinations(items, size),
});

const rangeExamples = [
  {
    name: 'all sizes ≥ default minSize',
    inputs: { items: ['a', 'b', 'c'] },
    want: [
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
      ['a', 'b', 'c'],
    ],
  },
  {
    name: 'respects minSize',
    inputs: { items: [1, 2, 3], minSize: 3 },
    want: [[1, 2, 3]],
  },
  {
    name: 'respects maxSize',
    inputs: { items: [1, 2, 3, 4], minSize: 2, maxSize: 2 },
    want: [
      [1, 2],
      [1, 3],
      [1, 4],
      [2, 3],
      [2, 4],
      [3, 4],
    ],
  },
  { name: 'non-array input → empty', inputs: { items: null }, want: [] },
];

runTable({
  describe: 'rangeCombinations',
  examples: rangeExamples,
  process: ({ items, minSize, maxSize }) => rangeCombinations(items, minSize, maxSize),
});

// `caps maxSize at array length` is a relational assertion (one call ===
// another call), not a literal want — kept as a focused imperative check.
import { describe, expect, it } from 'vitest';
describe('rangeCombinations: maxSize cap', () => {
  it('caps maxSize at array length', () => {
    const withCap = rangeCombinations([1, 2], 1, 100);
    const withoutCap = rangeCombinations([1, 2], 1, 2);
    expect(withCap).toStrictEqual(withoutCap);
  });
});
