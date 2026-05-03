import { beforeEach, vi, expect } from 'vitest';

vi.mock('../list/index.js', () => ({ default: vi.fn() }));
vi.mock('../score/index.js', () => ({ default: vi.fn() }));

import collectTerms from './index.js';
import list from '../list/index.js';
import score from '../score/index.js';
import { runTable, equals, all } from '../../lib/examples-runner/index.js';

beforeEach(() => vi.clearAllMocks());

runTable({
  describe: 'collectTerms chain',
  examples: [
    {
      name: 'deduplicates and reduces to top terms',
      inputs: {
        text: 'p1\n\np2',
        options: { chunkLen: 2, topN: 2 },
        preMock: () => {
          list.mockResolvedValueOnce(['alpha', 'beta']).mockResolvedValueOnce(['beta', 'gamma']);
          score.mockResolvedValue([8, 9, 7]);
        },
      },
      check: all(equals(['beta', 'alpha']), () => {
        expect(list).toHaveBeenCalledTimes(2);
        expect(score).toHaveBeenCalled();
      }),
    },
  ],
  process: async ({ text, options, preMock }) => {
    if (preMock) preMock();
    return collectTerms(text, options);
  },
});
