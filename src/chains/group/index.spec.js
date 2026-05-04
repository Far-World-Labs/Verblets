import group, { groupItem, groupParallel } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import reduce from '../reduce/index.js';
import callLlm from '../../lib/llm/index.js';
import { vi, beforeEach, expect } from 'vitest';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

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

runTable({
  describe: 'group chain — discovers categories then assigns items',
  examples: [
    {
      name: 'discovers categories then assigns items',
      inputs: {
        list: ['a', 'bb', 'ccc', 'dddd', 'eeeee'],
        instructions: 'odd or even',
        options: { batchSize: 2 },
      },
      mocks: {
        reduce: ['odd, even'],
        listBatch: [['odd', 'even'], ['odd', 'even'], ['odd']],
      },
      want: {
        value: { odd: ['a', 'ccc', 'eeeee'], even: ['bb', 'dddd'] },
        reduceCalls: 1,
        listBatchCalls: 3,
      },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { reduce, listBatch });
    return group(inputs.list, inputs.instructions, inputs.options);
  },
  expects: ({ result, inputs, want }) => {
    expect(result).toEqual(want.value);
    expect(reduce).toHaveBeenCalledTimes(want.reduceCalls);
    expect(reduce).toHaveBeenCalledWith(
      inputs.list,
      expect.stringContaining('determine what category'),
      expect.objectContaining({ initial: '' })
    );
    expect(listBatch).toHaveBeenCalledTimes(want.listBatchCalls);
  },
});

runTable({
  describe: 'group chain — discovery prompt construction',
  examples: [
    {
      name: 'granularity=low embeds "fewer, broader" guidance',
      inputs: { list: ['a'], instructions: 'group items', options: { granularity: 'low' } },
      mocks: { reduce: ['broad-category'], listBatch: [['broad-category']] },
      want: {
        contains: ['granularity-guidance', 'fewer, broader categories', 'Merge aggressively'],
      },
    },
    {
      name: 'granularity=high embeds "finer-grained" guidance',
      inputs: { list: ['a'], instructions: 'group items', options: { granularity: 'high' } },
      mocks: { reduce: ['cat-a, cat-b, cat-c'], listBatch: [['cat-a']] },
      want: { contains: ['granularity-guidance', 'finer-grained', 'Preserve subtle distinctions'] },
    },
    {
      name: 'omits granularity guidance when not specified',
      inputs: { list: ['a'], instructions: 'group items' },
      mocks: { reduce: ['cat-a'], listBatch: [['cat-a']] },
      want: { notContains: ['granularity-guidance'] },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { reduce, listBatch });
    await group(inputs.list, inputs.instructions, inputs.options);
    return reduce.mock.calls[0][1];
  },
  expects: ({ result, want }) => {
    if (want.contains) {
      for (const fragment of want.contains) expect(result).toContain(fragment);
    }
    if (want.notContains) {
      for (const fragment of want.notContains) expect(result).not.toContain(fragment);
    }
  },
});

runTable({
  describe: 'groupItem',
  examples: [
    {
      name: 'assigns one item to a provided category and embeds <categories> in prompt',
      inputs: { item: 'a', bundle: { text: 'odd or even', categories: 'odd, even' } },
      mocks: { callLlm: ['odd'] },
      want: { value: 'odd', promptContains: ['<categories>', 'odd, even'] },
    },
    {
      name: 'accepts categories as an array',
      inputs: {
        item: 'cat',
        bundle: { text: 'classify', categories: ['animals', 'plants', 'minerals'] },
      },
      mocks: { callLlm: ['animals'] },
      want: { value: 'animals' },
    },
    {
      name: 'throws when categories are missing',
      inputs: { item: 'x', bundle: 'instructions' },
      want: { throws: /categories must be provided/ },
    },
    {
      name: 'throws when LLM returns a blank category name',
      inputs: { item: 'a', bundle: { text: 'classify', categories: 'one, two' } },
      mocks: { callLlm: ['   '] },
      want: { throws: /blank category name/ },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { callLlm });
    return groupItem(inputs.item, inputs.bundle);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('value' in want) expect(result).toEqual(want.value);
    if (want.promptContains) {
      const prompt = vi.mocked(callLlm).mock.calls[0][0];
      for (const fragment of want.promptContains) expect(prompt).toContain(fragment);
    }
  },
});

runTable({
  describe: 'groupParallel',
  examples: [
    {
      name: 'assigns each item via groupItem and aggregates by category',
      inputs: {
        list: ['a', 'bb', 'ccc'],
        bundle: { text: 'odd or even by length', categories: 'odd, even' },
      },
      mocks: { callLlm: ['odd', 'even', 'odd'] },
      want: { value: { odd: ['a', 'ccc'], even: ['bb'] }, llmCalls: 3 },
    },
    {
      name: 'throws when categories are missing',
      inputs: { list: ['a'], bundle: 'instructions' },
      want: { throws: /categories must be provided/ },
    },
    {
      name: 'empty list → empty object, no LLM call',
      inputs: { list: [], bundle: { text: 'x', categories: 'one, two' } },
      want: { value: {}, llmCalls: 0 },
    },
    {
      name: 'throws when every item fails',
      inputs: {
        list: ['a', 'b'],
        bundle: { text: 'x', categories: 'one, two' },
        options: { maxParallel: 1 },
      },
      mocks: { callLlm: ['   ', '   '] },
      want: { throws: /failed to assign any of 2 items/ },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { callLlm });
    return groupParallel(inputs.list, inputs.bundle, inputs.options);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('value' in want) expect(result).toEqual(want.value);
    if ('llmCalls' in want) expect(callLlm).toHaveBeenCalledTimes(want.llmCalls);
  },
});
