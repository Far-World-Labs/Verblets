import { vi, beforeEach, expect } from 'vitest';
import detectPatterns from './index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

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
      },
      mocks: {
        reduce: [
          [
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
          ],
        ],
      },
      want: {
        value: [
          { theme: { values: ['dark', 'light'] }, fontSize: { range: [12, 16] } },
          { category: { values: ['books'] }, price: { range: [10, 20] } },
        ],
      },
    },
    {
      name: 'returns empty array for empty input',
      inputs: { objects: [] },
      mocks: { reduce: [[]] },
      want: { value: [] },
    },
    {
      name: 'throws on malformed reduce response (not an array)',
      inputs: { objects: [{ a: 1 }] },
      mocks: { reduce: ['not an array'] },
      want: { throws: /expected pattern candidates array/ },
    },
    {
      name: 'throws on non-array input',
      inputs: { objects: 'not array' },
      want: { throws: /objects must be an array/ },
    },
    {
      name: 'thoroughness low limits capacity in reduce prompt',
      inputs: { objects: [{ a: 1 }], options: { thoroughness: 'low' } },
      mocks: { reduce: [[]] },
      want: { promptContains: ['Maximum 20 total items'] },
    },
    {
      name: 'thoroughness high increases capacity in reduce prompt',
      inputs: { objects: [{ a: 1 }], options: { thoroughness: 'high' } },
      mocks: { reduce: [[]] },
      want: { promptContains: ['Maximum 100 total items'] },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { reduce });
    return detectPatterns(inputs.objects, inputs.options);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('value' in want) expect(result).toEqual(want.value);
    if (want.promptContains) {
      const prompt = reduce.mock.calls[0][1];
      for (const fragment of want.promptContains) expect(prompt).toContain(fragment);
    }
  },
});
