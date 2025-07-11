import group from './index.js';
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
});
