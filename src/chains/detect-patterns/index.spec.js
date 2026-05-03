import { vi, beforeEach, expect } from 'vitest';
import detectPatterns from './index.js';
import { runTable, equals, throws } from '../../lib/examples-runner/index.js';

vi.mock('../reduce/index.js', () => ({ default: vi.fn() }));

import reduce from '../reduce/index.js';

beforeEach(() => vi.clearAllMocks());

runTable({
  describe: 'detect-patterns',
  examples: [
    {
      name: 'extracts pattern templates sorted by count, limited by topN',
      inputs: {
        objects: [
          { theme: 'dark', fontSize: 14 },
          { theme: 'light', fontSize: 12 },
        ],
        options: { topN: 2 },
        preMock: () =>
          reduce.mockResolvedValueOnce([
            {
              type: 'pattern',
              template: { theme: { values: ['dark', 'light'] }, fontSize: { range: [12, 16] } },
              count: 5,
            },
            {
              type: 'pattern',
              template: { category: { values: ['books'] }, price: { range: [10, 20] } },
              count: 3,
            },
            {
              type: 'pattern',
              template: { color: { values: ['red'] } },
              count: 1,
            },
          ]),
      },
      check: equals([
        { theme: { values: ['dark', 'light'] }, fontSize: { range: [12, 16] } },
        { category: { values: ['books'] }, price: { range: [10, 20] } },
      ]),
    },
    {
      name: 'returns empty array for empty input',
      inputs: { objects: [], preMock: () => reduce.mockResolvedValueOnce([]) },
      check: equals([]),
    },
    {
      name: 'throws on malformed reduce response (not an array)',
      inputs: {
        objects: [{ a: 1 }],
        preMock: () => reduce.mockResolvedValueOnce('not an array'),
      },
      check: throws(/expected pattern candidates array/),
    },
    {
      name: 'throws on non-array input',
      inputs: { objects: 'not array' },
      check: throws(/objects must be an array/),
    },
    {
      name: 'thoroughness low limits capacity in reduce prompt',
      inputs: {
        objects: [{ a: 1 }],
        options: { thoroughness: 'low' },
        preMock: () => reduce.mockResolvedValueOnce([]),
      },
      check: () => expect(reduce.mock.calls[0][1]).toContain('Maximum 20 total items'),
    },
    {
      name: 'thoroughness high increases capacity in reduce prompt',
      inputs: {
        objects: [{ a: 1 }],
        options: { thoroughness: 'high' },
        preMock: () => reduce.mockResolvedValueOnce([]),
      },
      check: () => expect(reduce.mock.calls[0][1]).toContain('Maximum 100 total items'),
    },
  ],
  process: async ({ objects, options, preMock }) => {
    if (preMock) preMock();
    return detectPatterns(objects, options);
  },
});
