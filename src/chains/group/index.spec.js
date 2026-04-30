import group, { groupItem } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import reduce from '../reduce/index.js';
import callLlm from '../../lib/llm/index.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../lib/llm/index.js', async (importOriginal) => ({
  ...(await importOriginal()),
  default: vi.fn(),
}));

vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(),
  ListStyle: { AUTO: 'auto', XML: 'xml', NEWLINE: 'newline' },
  determineStyle: vi.fn(() => 'newline'),
}));

vi.mock('../reduce/index.js', () => ({
  default: vi.fn(),
}));

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

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => fn()),
}));

describe('group chain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('discovers categories then assigns items', async () => {
    const items = ['a', 'bb', 'ccc', 'dddd', 'eeeee'];

    // Mock reduce to return discovered categories
    reduce.mockResolvedValueOnce('odd, even');

    // Mock listBatch for assignment phase - with batchSize=2, we'll have 3 batches
    listBatch
      .mockResolvedValueOnce(['odd', 'even']) // First batch: ['a', 'bb']
      .mockResolvedValueOnce(['odd', 'even']) // Second batch: ['ccc', 'dddd']
      .mockResolvedValueOnce(['odd']); // Third batch: ['eeeee']

    const result = await group(items, 'odd or even', {
      batchSize: 2,
    });

    expect(result).toStrictEqual({ odd: ['a', 'ccc', 'eeeee'], even: ['bb', 'dddd'] });

    // Verify reduce was called for category discovery
    expect(reduce).toHaveBeenCalledTimes(1);
    expect(reduce).toHaveBeenCalledWith(
      items,
      expect.stringContaining('determine what category'),
      expect.objectContaining({ initial: '' })
    );

    // Verify listBatch was called for assignment
    expect(listBatch).toHaveBeenCalledTimes(3);
  });

  it('includes granularity guidance in category discovery prompt when set to low', async () => {
    reduce.mockResolvedValueOnce('broad-category');
    listBatch.mockResolvedValueOnce(['broad-category']);

    await group(['a'], 'group items', { granularity: 'low' });

    const [, discoveryPrompt] = reduce.mock.calls[0];
    expect(discoveryPrompt).toContain('granularity-guidance');
    expect(discoveryPrompt).toContain('fewer, broader categories');
    expect(discoveryPrompt).toContain('Merge aggressively');
  });

  it('includes granularity guidance in category discovery prompt when set to high', async () => {
    reduce.mockResolvedValueOnce('cat-a, cat-b, cat-c');
    listBatch.mockResolvedValueOnce(['cat-a']);

    await group(['a'], 'group items', { granularity: 'high' });

    const [, discoveryPrompt] = reduce.mock.calls[0];
    expect(discoveryPrompt).toContain('granularity-guidance');
    expect(discoveryPrompt).toContain('finer-grained');
    expect(discoveryPrompt).toContain('Preserve subtle distinctions');
  });

  it('omits granularity guidance when not specified', async () => {
    reduce.mockResolvedValueOnce('cat-a');
    listBatch.mockResolvedValueOnce(['cat-a']);

    await group(['a'], 'group items');

    const [, discoveryPrompt] = reduce.mock.calls[0];
    expect(discoveryPrompt).not.toContain('granularity-guidance');
  });
});

describe('groupItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assigns one item to a provided category', async () => {
    vi.mocked(callLlm).mockResolvedValueOnce('odd');
    const result = await groupItem('a', { text: 'odd or even', categories: 'odd, even' });
    expect(result).toBe('odd');
    expect(callLlm).toHaveBeenCalledTimes(1);
    const prompt = vi.mocked(callLlm).mock.calls[0][0];
    expect(prompt).toContain('<categories>');
    expect(prompt).toContain('odd, even');
  });

  it('accepts categories as an array', async () => {
    vi.mocked(callLlm).mockResolvedValueOnce('animals');
    const result = await groupItem('cat', {
      text: 'classify',
      categories: ['animals', 'plants', 'minerals'],
    });
    expect(result).toBe('animals');
  });

  it('throws when categories are not provided', async () => {
    await expect(groupItem('x', 'instructions')).rejects.toThrow(/categories must be provided/);
  });

  it('throws when LLM returns a blank category name', async () => {
    vi.mocked(callLlm).mockResolvedValueOnce('   ');
    await expect(groupItem('a', { text: 'classify', categories: 'one, two' })).rejects.toThrow(
      /blank category name/
    );
  });
});
