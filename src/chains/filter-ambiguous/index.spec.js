import { beforeEach, vi, expect } from 'vitest';
import filterAmbiguous from './index.js';
import score from '../score/index.js';
import list from '../list/index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

vi.mock('../score/index.js');
vi.mock('../list/index.js', () => ({ default: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

runTable({
  describe: 'filterAmbiguous chain',
  examples: [
    {
      name: 'returns scored ambiguous terms',
      inputs: { text: 's1\ns2', options: { topN: 1 } },
      mocks: {
        score: [
          [1, 9],
          [8, 3],
        ],
        list: [['alpha', 'beta'], []],
      },
      want: {
        value: [{ term: 'alpha', sentence: 's2', score: 8 }],
      },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { score, list });
    return filterAmbiguous(inputs.text, inputs.options);
  },
  expects: ({ result, want }) => {
    expect(result).toEqual(want.value);
    expect(score).toHaveBeenCalled();
    expect(list).toHaveBeenCalled();
  },
});
