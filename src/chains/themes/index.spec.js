import { vi, beforeEach, expect } from 'vitest';
import themes from './index.js';
import reduce from '../reduce/index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

vi.mock('../reduce/index.js', () => ({ default: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

runTable({
  describe: 'themes chain',
  examples: [
    {
      name: 'reduces in two passes and returns trimmed themes',
      inputs: { text: 'paragraph one\n\nparagraph two', options: { batchSize: 1, topN: 2 } },
      mocks: { reduce: ['a, b, c', 'a, c'] },
      want: { value: ['a', 'c'], reduceCalls: 2 },
    },
    {
      name: 'splits text on double newlines into paragraphs',
      inputs: { text: 'first\n\nsecond\n\nthird' },
      mocks: { reduce: ['theme', 'theme'] },
      want: { firstListSorted: ['first', 'second', 'third'] },
    },
    {
      name: 'passes topN to the refinement prompt',
      inputs: { text: 'x\n\ny', options: { topN: 2 } },
      mocks: { reduce: ['a, b, c', 'a, b'] },
      want: { secondPromptContains: ['top 2'] },
    },
    {
      name: 'omits topN limit when not specified',
      inputs: { text: 'x\n\ny' },
      mocks: { reduce: ['a, b', 'a, b'] },
      want: {
        secondPromptContains: ['Return all meaningful themes'],
        secondPromptNotContains: ['top'],
      },
    },
    {
      name: 'feeds first pass themes as list into second reduce',
      inputs: { text: 'x\n\ny' },
      mocks: { reduce: ['alpha, beta, gamma', 'alpha, gamma'] },
      want: { secondList: ['alpha', 'beta', 'gamma'] },
    },
    {
      name: 'filters empty strings from comma-split results',
      inputs: { text: 'x\n\ny' },
      mocks: { reduce: ['a,, b, ,c', 'a,, ,c'] },
      want: { value: ['a', 'c'] },
    },
    {
      name: 'handles single paragraph text',
      inputs: { text: 'just one paragraph' },
      mocks: { reduce: ['solo', 'solo'] },
      want: { value: ['solo'], firstList: ['just one paragraph'] },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { reduce });
    return themes(inputs.text, inputs.options);
  },
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    if ('reduceCalls' in want) expect(reduce).toHaveBeenCalledTimes(want.reduceCalls);
    if (want.firstListSorted) {
      const firstCallList = reduce.mock.calls[0][0];
      expect(firstCallList).toHaveLength(want.firstListSorted.length);
      expect(firstCallList.toSorted()).toStrictEqual(want.firstListSorted);
    }
    if (want.firstList) {
      expect(reduce.mock.calls[0][0]).toStrictEqual(want.firstList);
    }
    if (want.secondList) {
      expect(reduce.mock.calls[1][0]).toStrictEqual(want.secondList);
    }
    if (want.secondPromptContains) {
      const refine = reduce.mock.calls[1][1];
      for (const fragment of want.secondPromptContains) expect(refine).toContain(fragment);
    }
    if (want.secondPromptNotContains) {
      const refine = reduce.mock.calls[1][1];
      for (const fragment of want.secondPromptNotContains) {
        expect(refine).not.toContain(fragment);
      }
    }
  },
});
