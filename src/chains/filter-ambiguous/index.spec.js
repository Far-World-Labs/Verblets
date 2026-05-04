import { beforeEach, vi, expect } from 'vitest';
import filterAmbiguous from './index.js';
import score from '../score/index.js';
import list from '../list/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../score/index.js');
vi.mock('../list/index.js', () => ({ default: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

runTable({
  describe: 'filterAmbiguous chain',
  examples: [
    {
      name: 'returns scored ambiguous terms',
      inputs: {
        text: 's1\ns2',
        options: { topN: 1 },
        mock: () => {
          score.mockResolvedValueOnce([1, 9]).mockResolvedValueOnce([8, 3]);
          list.mockResolvedValueOnce(['alpha', 'beta']).mockResolvedValueOnce([]);
        },
        want: [{ term: 'alpha', sentence: 's2', score: 8 }],
      },
    },
  ],
  process: async ({ text, options, mock }) => {
    if (mock) mock();
    return filterAmbiguous(text, options);
  },
  expects: ({ result, inputs }) => {
    expect(result).toEqual(inputs.want);
    expect(score).toHaveBeenCalled();
    expect(list).toHaveBeenCalled();
  },
});
