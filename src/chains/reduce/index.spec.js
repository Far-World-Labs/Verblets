import { beforeEach, describe, expect, it, vi } from 'vitest';
import reduce from './index.js';
import listReduceLines from '../../verblets/list-reduce-lines/index.js';

vi.mock('../../verblets/list-reduce-lines/index.js', () => ({
  default: vi.fn(async (acc, list) => [acc, ...list].filter(Boolean).join('-')),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('reduce chain', () => {
  it('reduces in batches', async () => {
    const result = await reduce(['a', 'b', 'c', 'd'], 'join', { chunkSize: 2 });
    expect(result).toBe('a-b-c-d');
    expect(listReduceLines).toHaveBeenCalledTimes(2);
  });

  it('uses initial value', async () => {
    const result = await reduce(['x', 'y'], 'join', { initial: '0', chunkSize: 2 });
    expect(result).toBe('0-x-y');
    expect(listReduceLines).toHaveBeenCalledTimes(1);
  });

  it('uses initial value with more elements', async () => {
    const result = await reduce(['x', 'y', 'z'], 'join', { initial: '0', chunkSize: 2 });
    expect(result).toBe('0-x-y-z');
    expect(listReduceLines).toHaveBeenCalledTimes(2);
  });
});
