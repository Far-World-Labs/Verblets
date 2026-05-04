import { beforeEach, vi, expect } from 'vitest';

vi.mock('../list/index.js', () => ({ default: vi.fn() }));
vi.mock('../score/index.js', () => ({ default: vi.fn() }));

import collectTerms from './index.js';
import list from '../list/index.js';
import score from '../score/index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

beforeEach(() => vi.clearAllMocks());

runTable({
  describe: 'collectTerms chain',
  examples: [
    {
      name: 'deduplicates and reduces to top terms',
      inputs: { text: 'p1\n\np2', options: { chunkLen: 2, topN: 2 } },
      mocks: {
        list: [
          ['alpha', 'beta'],
          ['beta', 'gamma'],
        ],
        // score uses mockResolvedValue (broadcast) — that's a value-driven shape
        // for "all subsequent calls return this". Express it as a single-element
        // sequence; only the first call is mocked, but score is only called once
        // here since the list of unique terms produces one batch.
        score: [[8, 9, 7]],
      },
      want: { value: ['beta', 'alpha'], listCalls: 2 },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { list, score });
    return collectTerms(inputs.text, inputs.options);
  },
  expects: ({ result, want }) => {
    expect(result).toEqual(want.value);
    expect(list).toHaveBeenCalledTimes(want.listCalls);
    expect(score).toHaveBeenCalled();
  },
});
