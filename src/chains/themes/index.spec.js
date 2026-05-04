import { vi, beforeEach, expect } from 'vitest';
import themes from './index.js';
import reduce from '../reduce/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../reduce/index.js', () => ({ default: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

runTable({
  describe: 'themes chain',
  examples: [
    {
      name: 'reduces in two passes and returns trimmed themes',
      inputs: {
        text: 'paragraph one\n\nparagraph two',
        options: { batchSize: 1, topN: 2 },
        mock: () => reduce.mockResolvedValueOnce('a, b, c').mockResolvedValueOnce('a, c'),
        want: ['a', 'c'],
        wantReduceCalls: 2,
      },
    },
    {
      name: 'splits text on double newlines into paragraphs',
      inputs: {
        text: 'first\n\nsecond\n\nthird',
        mock: () => reduce.mockResolvedValueOnce('theme').mockResolvedValueOnce('theme'),
        wantFirstListSorted: ['first', 'second', 'third'],
      },
    },
    {
      name: 'passes topN to the refinement prompt',
      inputs: {
        text: 'x\n\ny',
        options: { topN: 2 },
        mock: () => reduce.mockResolvedValueOnce('a, b, c').mockResolvedValueOnce('a, b'),
        wantSecondPromptContains: ['top 2'],
      },
    },
    {
      name: 'omits topN limit when not specified',
      inputs: {
        text: 'x\n\ny',
        mock: () => reduce.mockResolvedValueOnce('a, b').mockResolvedValueOnce('a, b'),
        wantSecondPromptContains: ['Return all meaningful themes'],
        wantSecondPromptNotContains: ['top'],
      },
    },
    {
      name: 'feeds first pass themes as list into second reduce',
      inputs: {
        text: 'x\n\ny',
        mock: () =>
          reduce.mockResolvedValueOnce('alpha, beta, gamma').mockResolvedValueOnce('alpha, gamma'),
        wantSecondList: ['alpha', 'beta', 'gamma'],
      },
    },
    {
      name: 'filters empty strings from comma-split results',
      inputs: {
        text: 'x\n\ny',
        mock: () => reduce.mockResolvedValueOnce('a,, b, ,c').mockResolvedValueOnce('a,, ,c'),
        want: ['a', 'c'],
      },
    },
    {
      name: 'handles single paragraph text',
      inputs: {
        text: 'just one paragraph',
        mock: () => reduce.mockResolvedValueOnce('solo').mockResolvedValueOnce('solo'),
        want: ['solo'],
        wantFirstList: ['just one paragraph'],
      },
    },
  ],
  process: async ({ text, options, mock }) => {
    if (mock) mock();
    return themes(text, options);
  },
  expects: ({ result, inputs }) => {
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('wantReduceCalls' in inputs) expect(reduce).toHaveBeenCalledTimes(inputs.wantReduceCalls);
    if (inputs.wantFirstListSorted) {
      const firstCallList = reduce.mock.calls[0][0];
      expect(firstCallList).toHaveLength(inputs.wantFirstListSorted.length);
      expect(firstCallList.toSorted()).toStrictEqual(inputs.wantFirstListSorted);
    }
    if (inputs.wantFirstList) {
      expect(reduce.mock.calls[0][0]).toStrictEqual(inputs.wantFirstList);
    }
    if (inputs.wantSecondList) {
      expect(reduce.mock.calls[1][0]).toStrictEqual(inputs.wantSecondList);
    }
    if (inputs.wantSecondPromptContains) {
      const refine = reduce.mock.calls[1][1];
      for (const fragment of inputs.wantSecondPromptContains) expect(refine).toContain(fragment);
    }
    if (inputs.wantSecondPromptNotContains) {
      const refine = reduce.mock.calls[1][1];
      for (const fragment of inputs.wantSecondPromptNotContains) {
        expect(refine).not.toContain(fragment);
      }
    }
  },
});
