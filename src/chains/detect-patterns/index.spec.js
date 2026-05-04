import { vi, beforeEach, expect } from 'vitest';
import detectPatterns from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

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
        mock: () =>
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
        want: [
          { theme: { values: ['dark', 'light'] }, fontSize: { range: [12, 16] } },
          { category: { values: ['books'] }, price: { range: [10, 20] } },
        ],
      },
    },
    {
      name: 'returns empty array for empty input',
      inputs: { objects: [], mock: () => reduce.mockResolvedValueOnce([]), want: [] },
    },
    {
      name: 'throws on malformed reduce response (not an array)',
      inputs: {
        objects: [{ a: 1 }],
        mock: () => reduce.mockResolvedValueOnce('not an array'),
        throws: /expected pattern candidates array/,
      },
    },
    {
      name: 'throws on non-array input',
      inputs: { objects: 'not array', throws: /objects must be an array/ },
    },
    {
      name: 'thoroughness low limits capacity in reduce prompt',
      inputs: {
        objects: [{ a: 1 }],
        options: { thoroughness: 'low' },
        mock: () => reduce.mockResolvedValueOnce([]),
        wantPromptContains: ['Maximum 20 total items'],
      },
    },
    {
      name: 'thoroughness high increases capacity in reduce prompt',
      inputs: {
        objects: [{ a: 1 }],
        options: { thoroughness: 'high' },
        mock: () => reduce.mockResolvedValueOnce([]),
        wantPromptContains: ['Maximum 100 total items'],
      },
    },
  ],
  process: async ({ objects, options, mock }) => {
    if (mock) mock();
    return detectPatterns(objects, options);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if (inputs.wantPromptContains) {
      const prompt = reduce.mock.calls[0][1];
      for (const fragment of inputs.wantPromptContains) expect(prompt).toContain(fragment);
    }
  },
});
