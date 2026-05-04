import group, { groupItem, groupParallel } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import reduce from '../reduce/index.js';
import callLlm from '../../lib/llm/index.js';
import { vi, beforeEach, expect } from 'vitest';
import { runTable } from '../../lib/examples-runner/index.js';

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

// ─── group: result + reduce-call shape ───────────────────────────────────

runTable({
  describe: 'group chain — discovers categories then assigns items',
  examples: [
    {
      name: 'discovers categories then assigns items',
      inputs: {
        list: ['a', 'bb', 'ccc', 'dddd', 'eeeee'],
        instructions: 'odd or even',
        options: { batchSize: 2 },
        mock: () => {
          reduce.mockResolvedValueOnce('odd, even');
          listBatch
            .mockResolvedValueOnce(['odd', 'even'])
            .mockResolvedValueOnce(['odd', 'even'])
            .mockResolvedValueOnce(['odd']);
        },
        want: { odd: ['a', 'ccc', 'eeeee'], even: ['bb', 'dddd'] },
        wantReduceCalls: 1,
        wantListBatchCalls: 3,
      },
    },
  ],
  process: async ({ list, instructions, options, mock }) => {
    if (mock) mock();
    return group(list, instructions, options);
  },
  expects: ({ result, inputs }) => {
    expect(result).toEqual(inputs.want);
    expect(reduce).toHaveBeenCalledTimes(inputs.wantReduceCalls);
    expect(reduce).toHaveBeenCalledWith(
      inputs.list,
      expect.stringContaining('determine what category'),
      expect.objectContaining({ initial: '' })
    );
    expect(listBatch).toHaveBeenCalledTimes(inputs.wantListBatchCalls);
  },
});

// ─── group: discovery prompt content ─────────────────────────────────────

runTable({
  describe: 'group chain — discovery prompt construction',
  examples: [
    {
      name: 'granularity=low embeds "fewer, broader" guidance',
      inputs: {
        list: ['a'],
        instructions: 'group items',
        options: { granularity: 'low' },
        mock: () => {
          reduce.mockResolvedValueOnce('broad-category');
          listBatch.mockResolvedValueOnce(['broad-category']);
        },
        wantContains: ['granularity-guidance', 'fewer, broader categories', 'Merge aggressively'],
      },
    },
    {
      name: 'granularity=high embeds "finer-grained" guidance',
      inputs: {
        list: ['a'],
        instructions: 'group items',
        options: { granularity: 'high' },
        mock: () => {
          reduce.mockResolvedValueOnce('cat-a, cat-b, cat-c');
          listBatch.mockResolvedValueOnce(['cat-a']);
        },
        wantContains: ['granularity-guidance', 'finer-grained', 'Preserve subtle distinctions'],
      },
    },
    {
      name: 'omits granularity guidance when not specified',
      inputs: {
        list: ['a'],
        instructions: 'group items',
        mock: () => {
          reduce.mockResolvedValueOnce('cat-a');
          listBatch.mockResolvedValueOnce(['cat-a']);
        },
        wantNotContains: ['granularity-guidance'],
      },
    },
  ],
  process: async ({ list, instructions, options, mock }) => {
    if (mock) mock();
    await group(list, instructions, options);
    return reduce.mock.calls[0][1];
  },
  expects: ({ result, inputs }) => {
    if (inputs.wantContains) {
      for (const fragment of inputs.wantContains) expect(result).toContain(fragment);
    }
    if (inputs.wantNotContains) {
      for (const fragment of inputs.wantNotContains) expect(result).not.toContain(fragment);
    }
  },
});

// ─── groupItem ───────────────────────────────────────────────────────────

runTable({
  describe: 'groupItem',
  examples: [
    {
      name: 'assigns one item to a provided category and embeds <categories> in prompt',
      inputs: {
        item: 'a',
        bundle: { text: 'odd or even', categories: 'odd, even' },
        mock: () => vi.mocked(callLlm).mockResolvedValueOnce('odd'),
        want: 'odd',
        wantPromptContains: ['<categories>', 'odd, even'],
      },
    },
    {
      name: 'accepts categories as an array',
      inputs: {
        item: 'cat',
        bundle: { text: 'classify', categories: ['animals', 'plants', 'minerals'] },
        mock: () => vi.mocked(callLlm).mockResolvedValueOnce('animals'),
        want: 'animals',
      },
    },
    {
      name: 'throws when categories are missing',
      inputs: { item: 'x', bundle: 'instructions', throws: /categories must be provided/ },
    },
    {
      name: 'throws when LLM returns a blank category name',
      inputs: {
        item: 'a',
        bundle: { text: 'classify', categories: 'one, two' },
        mock: () => vi.mocked(callLlm).mockResolvedValueOnce('   '),
        throws: /blank category name/,
      },
    },
  ],
  process: async ({ item, bundle, mock }) => {
    if (mock) mock();
    return groupItem(item, bundle);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if (inputs.wantPromptContains) {
      const prompt = vi.mocked(callLlm).mock.calls[0][0];
      for (const fragment of inputs.wantPromptContains) expect(prompt).toContain(fragment);
    }
  },
});

// ─── groupParallel ───────────────────────────────────────────────────────

runTable({
  describe: 'groupParallel',
  examples: [
    {
      name: 'assigns each item via groupItem and aggregates by category',
      inputs: {
        list: ['a', 'bb', 'ccc'],
        bundle: { text: 'odd or even by length', categories: 'odd, even' },
        mock: () =>
          vi
            .mocked(callLlm)
            .mockResolvedValueOnce('odd')
            .mockResolvedValueOnce('even')
            .mockResolvedValueOnce('odd'),
        want: { odd: ['a', 'ccc'], even: ['bb'] },
        wantLlmCalls: 3,
      },
    },
    {
      name: 'throws when categories are missing',
      inputs: { list: ['a'], bundle: 'instructions', throws: /categories must be provided/ },
    },
    {
      name: 'empty list → empty object, no LLM call',
      inputs: {
        list: [],
        bundle: { text: 'x', categories: 'one, two' },
        want: {},
        wantLlmCalls: 0,
      },
    },
    {
      name: 'throws when every item fails',
      inputs: {
        list: ['a', 'b'],
        bundle: { text: 'x', categories: 'one, two' },
        options: { maxParallel: 1 },
        mock: () => vi.mocked(callLlm).mockResolvedValue('   '),
        throws: /failed to assign any of 2 items/,
      },
    },
  ],
  process: async ({ list, bundle, options, mock }) => {
    if (mock) mock();
    return groupParallel(list, bundle, options);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('wantLlmCalls' in inputs) expect(callLlm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
  },
});
