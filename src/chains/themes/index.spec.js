import { vi, beforeEach, expect } from 'vitest';
import themes from './index.js';
import reduce from '../reduce/index.js';
import { runTable, equals, all } from '../../lib/examples-runner/index.js';

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
        preMock: () => reduce.mockResolvedValueOnce('a, b, c').mockResolvedValueOnce('a, c'),
      },
      check: all(equals(['a', 'c']), () => expect(reduce).toHaveBeenCalledTimes(2)),
    },
    {
      name: 'splits text on double newlines into paragraphs',
      inputs: {
        text: 'first\n\nsecond\n\nthird',
        preMock: () => reduce.mockResolvedValueOnce('theme').mockResolvedValueOnce('theme'),
      },
      check: () => {
        const firstCallList = reduce.mock.calls[0][0];
        expect(firstCallList).toHaveLength(3);
        expect(firstCallList.toSorted()).toStrictEqual(['first', 'second', 'third']);
      },
    },
    {
      name: 'passes topN to the refinement prompt',
      inputs: {
        text: 'x\n\ny',
        options: { topN: 2 },
        preMock: () => reduce.mockResolvedValueOnce('a, b, c').mockResolvedValueOnce('a, b'),
      },
      check: () => expect(reduce.mock.calls[1][1]).toContain('top 2'),
    },
    {
      name: 'omits topN limit when not specified',
      inputs: {
        text: 'x\n\ny',
        preMock: () => reduce.mockResolvedValueOnce('a, b').mockResolvedValueOnce('a, b'),
      },
      check: () => {
        const refine = reduce.mock.calls[1][1];
        expect(refine).toContain('Return all meaningful themes');
        expect(refine).not.toContain('top');
      },
    },
    {
      name: 'feeds first pass themes as list into second reduce',
      inputs: {
        text: 'x\n\ny',
        preMock: () =>
          reduce.mockResolvedValueOnce('alpha, beta, gamma').mockResolvedValueOnce('alpha, gamma'),
      },
      check: () => expect(reduce.mock.calls[1][0]).toStrictEqual(['alpha', 'beta', 'gamma']),
    },
    {
      name: 'filters empty strings from comma-split results',
      inputs: {
        text: 'x\n\ny',
        preMock: () => reduce.mockResolvedValueOnce('a,, b, ,c').mockResolvedValueOnce('a,, ,c'),
      },
      check: equals(['a', 'c']),
    },
    {
      name: 'handles single paragraph text',
      inputs: {
        text: 'just one paragraph',
        preMock: () => reduce.mockResolvedValueOnce('solo').mockResolvedValueOnce('solo'),
      },
      check: all(equals(['solo']), () =>
        expect(reduce.mock.calls[0][0]).toStrictEqual(['just one paragraph'])
      ),
    },
  ],
  process: async ({ text, options, preMock }) => {
    if (preMock) preMock();
    return themes(text, options);
  },
});
