import group, { groupItem, groupParallel } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import reduce from '../reduce/index.js';
import callLlm from '../../lib/llm/index.js';
import { vi, beforeEach, expect } from 'vitest';
import { runTable, equals, contains, all, throws } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', async (importOriginal) => ({
  ...(await importOriginal()),
  default: vi.fn(),
}));

vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(),
  ListStyle: { AUTO: 'auto', XML: 'xml', NEWLINE: 'newline' },
  determineStyle: vi.fn(() => 'newline'),
}));

vi.mock('../reduce/index.js', () => ({ default: vi.fn() }));

vi.mock('../../lib/text-batch/index.js', () => ({
  default: vi.fn((items, config) => {
    const batchSize = config?.batchSize || 10;
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push({ items: items.slice(i, i + batchSize), startIndex: i });
    }
    return batches;
  }),
}));

vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn(async (fn) => fn()) }));

beforeEach(() => vi.clearAllMocks());

// ─── group (default — discovery + assignment) ─────────────────────────────

const groupExamples = [
  {
    name: 'discovers categories then assigns items',
    inputs: {
      list: ['a', 'bb', 'ccc', 'dddd', 'eeeee'],
      instructions: 'odd or even',
      options: { batchSize: 2 },
      preMock: () => {
        reduce.mockResolvedValueOnce('odd, even');
        listBatch
          .mockResolvedValueOnce(['odd', 'even'])
          .mockResolvedValueOnce(['odd', 'even'])
          .mockResolvedValueOnce(['odd']);
      },
    },
    check: all(equals({ odd: ['a', 'ccc', 'eeeee'], even: ['bb', 'dddd'] }), () => {
      expect(reduce).toHaveBeenCalledTimes(1);
      expect(reduce).toHaveBeenCalledWith(
        ['a', 'bb', 'ccc', 'dddd', 'eeeee'],
        expect.stringContaining('determine what category'),
        expect.objectContaining({ initial: '' })
      );
      expect(listBatch).toHaveBeenCalledTimes(3);
    }),
  },
  {
    name: 'granularity=low embeds "fewer, broader" guidance',
    inputs: {
      list: ['a'],
      instructions: 'group items',
      options: { granularity: 'low' },
      preMock: () => {
        reduce.mockResolvedValueOnce('broad-category');
        listBatch.mockResolvedValueOnce(['broad-category']);
      },
      returnDiscoveryPrompt: true,
    },
    check: all(
      contains('granularity-guidance'),
      contains('fewer, broader categories'),
      contains('Merge aggressively')
    ),
  },
  {
    name: 'granularity=high embeds "finer-grained" guidance',
    inputs: {
      list: ['a'],
      instructions: 'group items',
      options: { granularity: 'high' },
      preMock: () => {
        reduce.mockResolvedValueOnce('cat-a, cat-b, cat-c');
        listBatch.mockResolvedValueOnce(['cat-a']);
      },
      returnDiscoveryPrompt: true,
    },
    check: all(
      contains('granularity-guidance'),
      contains('finer-grained'),
      contains('Preserve subtle distinctions')
    ),
  },
  {
    name: 'omits granularity guidance when not specified',
    inputs: {
      list: ['a'],
      instructions: 'group items',
      preMock: () => {
        reduce.mockResolvedValueOnce('cat-a');
        listBatch.mockResolvedValueOnce(['cat-a']);
      },
      returnDiscoveryPrompt: true,
    },
    check: ({ result }) => expect(result).not.toContain('granularity-guidance'),
  },
];

runTable({
  describe: 'group chain',
  examples: groupExamples,
  process: async ({ list, instructions, options, preMock, returnDiscoveryPrompt }) => {
    if (preMock) preMock();
    const result = await group(list, instructions, options);
    return returnDiscoveryPrompt ? reduce.mock.calls[0][1] : result;
  },
});

// ─── groupItem (per-item) ─────────────────────────────────────────────────

const groupItemExamples = [
  {
    name: 'assigns one item to a provided category and embeds <categories> in prompt',
    inputs: {
      item: 'a',
      bundle: { text: 'odd or even', categories: 'odd, even' },
      preMock: () => vi.mocked(callLlm).mockResolvedValueOnce('odd'),
    },
    check: all(equals('odd'), () => {
      expect(callLlm).toHaveBeenCalledTimes(1);
      const prompt = vi.mocked(callLlm).mock.calls[0][0];
      expect(prompt).toContain('<categories>');
      expect(prompt).toContain('odd, even');
    }),
  },
  {
    name: 'accepts categories as an array',
    inputs: {
      item: 'cat',
      bundle: { text: 'classify', categories: ['animals', 'plants', 'minerals'] },
      preMock: () => vi.mocked(callLlm).mockResolvedValueOnce('animals'),
    },
    check: equals('animals'),
  },
  {
    name: 'throws when categories are missing',
    inputs: { item: 'x', bundle: 'instructions' },
    check: throws(/categories must be provided/),
  },
  {
    name: 'throws when LLM returns a blank category name',
    inputs: {
      item: 'a',
      bundle: { text: 'classify', categories: 'one, two' },
      preMock: () => vi.mocked(callLlm).mockResolvedValueOnce('   '),
    },
    check: throws(/blank category name/),
  },
];

runTable({
  describe: 'groupItem',
  examples: groupItemExamples,
  process: async ({ item, bundle, preMock }) => {
    if (preMock) preMock();
    return groupItem(item, bundle);
  },
});

// ─── groupParallel ────────────────────────────────────────────────────────

const groupParallelExamples = [
  {
    name: 'assigns each item via groupItem and aggregates by category',
    inputs: {
      list: ['a', 'bb', 'ccc'],
      bundle: { text: 'odd or even by length', categories: 'odd, even' },
      preMock: () =>
        vi
          .mocked(callLlm)
          .mockResolvedValueOnce('odd')
          .mockResolvedValueOnce('even')
          .mockResolvedValueOnce('odd'),
    },
    check: all(equals({ odd: ['a', 'ccc'], even: ['bb'] }), () => {
      expect(callLlm).toHaveBeenCalledTimes(3);
    }),
  },
  {
    name: 'throws when categories are missing',
    inputs: { list: ['a'], bundle: 'instructions' },
    check: throws(/categories must be provided/),
  },
  {
    name: 'empty list → empty object, no LLM call',
    inputs: { list: [], bundle: { text: 'x', categories: 'one, two' } },
    check: all(equals({}), () => expect(callLlm).not.toHaveBeenCalled()),
  },
  {
    name: 'throws when every item fails',
    inputs: {
      list: ['a', 'b'],
      bundle: { text: 'x', categories: 'one, two' },
      options: { maxParallel: 1 },
      preMock: () => vi.mocked(callLlm).mockResolvedValue('   '),
    },
    check: throws(/failed to assign any of 2 items/),
  },
];

runTable({
  describe: 'groupParallel',
  examples: groupParallelExamples,
  process: async ({ list, bundle, options, preMock }) => {
    if (preMock) preMock();
    return groupParallel(list, bundle, options);
  },
});
