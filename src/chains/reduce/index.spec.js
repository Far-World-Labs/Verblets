import { beforeEach, describe, expect, it, vi } from 'vitest';
import reduce from './index.js';
import listBatch from '../../verblets/list-batch/index.js';

vi.mock('../../lib/text-batch/index.js', () => ({
  default: vi.fn((list) => {
    // Simple batching for tests
    const batches = [];
    for (let i = 0; i < list.length; i += 2) {
      const items = list.slice(i, i + 2);
      batches.push({ items, startIndex: i });
    }
    return batches;
  }),
}));

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn((fn) => fn()),
}));

vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(async (items, instructions) => {
    // Simulate reduce behavior: take accumulator from instructions and append items
    const instructionText =
      typeof instructions === 'function'
        ? instructions({ style: 'newline', count: items.length })
        : instructions;

    // Extract accumulator from the instruction text (simplified for test)
    const accMatch = instructionText.match(/<accumulator>(.*?)<\/accumulator>/s);
    const acc = accMatch ? accMatch[1].trim() : '';

    return [acc, ...items].filter(Boolean).join('-');
  }),
  ListStyle: {
    NEWLINE: 'newline',
    XML: 'xml',
    AUTO: 'auto',
  },
  determineStyle: vi.fn(() => 'newline'),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('reduce chain', () => {
  it('reduces in batches', async () => {
    const result = await reduce(['a', 'b', 'c', 'd'], 'join', { batchSize: 2 });
    expect(result).toBe('a-b-c-d');
    expect(listBatch).toHaveBeenCalledTimes(2);
  });

  it('uses initial value', async () => {
    const result = await reduce(['x', 'y'], 'join', { initial: '0', batchSize: 2 });
    expect(result).toBe('0-x-y');
    expect(listBatch).toHaveBeenCalledTimes(1);
  });

  it('uses initial value with more elements', async () => {
    const result = await reduce(['x', 'y', 'z'], 'join', { initial: '0', batchSize: 2 });
    expect(result).toBe('0-x-y-z');
    expect(listBatch).toHaveBeenCalledTimes(2);
  });
});
