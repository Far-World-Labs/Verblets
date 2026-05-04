import { beforeEach, vi, expect } from 'vitest';

vi.mock('../list/index.js', () => ({ default: vi.fn() }));
vi.mock('../score/index.js', () => ({ default: vi.fn() }));

import collectTerms from './index.js';
import list from '../list/index.js';
import score from '../score/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

beforeEach(() => vi.clearAllMocks());

runTable({
  describe: 'collectTerms chain',
  examples: [
    {
      name: 'deduplicates and reduces to top terms',
      inputs: {
        text: 'p1\n\np2',
        options: { chunkLen: 2, topN: 2 },
        mock: () => {
          list.mockResolvedValueOnce(['alpha', 'beta']).mockResolvedValueOnce(['beta', 'gamma']);
          score.mockResolvedValue([8, 9, 7]);
        },
        want: ['beta', 'alpha'],
        wantListCalls: 2,
      },
    },
  ],
  process: async ({ text, options, mock }) => {
    if (mock) mock();
    return collectTerms(text, options);
  },
  expects: ({ result, inputs }) => {
    expect(result).toEqual(inputs.want);
    expect(list).toHaveBeenCalledTimes(inputs.wantListCalls);
    expect(score).toHaveBeenCalled();
  },
});
