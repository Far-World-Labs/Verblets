import { beforeEach, vi, expect } from 'vitest';
import filterAmbiguous from './index.js';
import score from '../score/index.js';
import list from '../list/index.js';
import { runTable, equals, all } from '../../lib/examples-runner/index.js';

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
        preMock: () => {
          score.mockResolvedValueOnce([1, 9]).mockResolvedValueOnce([8, 3]);
          list.mockResolvedValueOnce(['alpha', 'beta']).mockResolvedValueOnce([]);
        },
      },
      check: all(equals([{ term: 'alpha', sentence: 's2', score: 8 }]), () => {
        expect(score).toHaveBeenCalled();
        expect(list).toHaveBeenCalled();
      }),
    },
  ],
  process: async ({ text, options, preMock }) => {
    if (preMock) preMock();
    return filterAmbiguous(text, options);
  },
});
