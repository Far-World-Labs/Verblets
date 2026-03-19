import group, { mapGranularity } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';
import reduce from '../reduce/index.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';

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
      batches.push({ items: items.slice(i, i + batchSize), startIndex: i, skip: false });
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

describe('mapGranularity', () => {
  it('returns default config for undefined', () => {
    const result = mapGranularity(undefined);
    expect(result).toStrictEqual({ guidance: undefined, topN: undefined });
  });

  it('returns broad guidance and low topN for low', () => {
    const result = mapGranularity('low');
    expect(result.guidance).toContain('fewer, broader categories');
    expect(result.topN).toBe(5);
  });

  it('returns default config for med', () => {
    const result = mapGranularity('med');
    expect(result).toStrictEqual({ guidance: undefined, topN: undefined });
  });

  it('returns fine-grained guidance and high topN for high', () => {
    const result = mapGranularity('high');
    expect(result.guidance).toContain('finer-grained');
    expect(result.topN).toBe(20);
  });

  it('returns default config for unknown string', () => {
    const result = mapGranularity('medium');
    expect(result).toStrictEqual({ guidance: undefined, topN: undefined });
  });

  it('passes through object values', () => {
    const custom = { guidance: 'custom', topN: 10 };
    expect(mapGranularity(custom)).toBe(custom);
  });
});
