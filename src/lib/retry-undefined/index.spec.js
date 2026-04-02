import { describe, expect, it, vi } from 'vitest';

import retryUndefined from './index.js';

describe('retryUndefined', () => {
  it('does nothing when all results are defined', async () => {
    const results = ['a', 'b', 'c'];
    const list = ['x', 'y', 'z'];
    const process = vi.fn();

    const attempts = await retryUndefined(results, list, process, 3);

    expect(attempts).toBe(0);
    expect(process).not.toHaveBeenCalled();
    expect(results).toEqual(['a', 'b', 'c']);
  });

  it('retries undefined entries and fills them in', async () => {
    const results = ['a', undefined, 'c', undefined];
    const list = ['w', 'x', 'y', 'z'];
    const process = vi.fn().mockResolvedValue(['B', 'D']);

    const attempts = await retryUndefined(results, list, process, 3);

    expect(attempts).toBe(1);
    expect(process).toHaveBeenCalledTimes(1);
    expect(process).toHaveBeenCalledWith(['x', 'z'], 1);
    expect(results).toEqual(['a', 'B', 'c', 'D']);
  });

  it('does not overwrite defined results with undefined from retry', async () => {
    const results = ['a', undefined, 'c'];
    const list = ['w', 'x', 'y'];
    // Processor returns undefined for the retried item — should not overwrite
    const process = vi.fn().mockResolvedValue([undefined]);

    const attempts = await retryUndefined(results, list, process, 2);

    expect(attempts).toBe(1);
    expect(results).toEqual(['a', undefined, 'c']);
  });

  it('retries up to maxAttempts - 1 times', async () => {
    const results = [undefined];
    const list = ['x'];
    // Always returns undefined — never succeeds
    const process = vi.fn().mockResolvedValue([undefined]);

    const attempts = await retryUndefined(results, list, process, 4);

    expect(attempts).toBe(3);
    expect(process).toHaveBeenCalledTimes(3);
    expect(process).toHaveBeenNthCalledWith(1, ['x'], 1);
    expect(process).toHaveBeenNthCalledWith(2, ['x'], 2);
    expect(process).toHaveBeenNthCalledWith(3, ['x'], 3);
  });

  it('stops retrying once all entries are filled', async () => {
    const results = [undefined, undefined, 'c'];
    const list = ['a', 'b', 'c'];
    // First retry fills one, second fills the other
    const process = vi.fn().mockResolvedValueOnce(['A', undefined]).mockResolvedValueOnce(['B']);

    const attempts = await retryUndefined(results, list, process, 5);

    expect(attempts).toBe(2);
    expect(process).toHaveBeenCalledTimes(2);
    expect(process).toHaveBeenNthCalledWith(1, ['a', 'b'], 1);
    expect(process).toHaveBeenNthCalledWith(2, ['b'], 2);
    expect(results).toEqual(['A', 'B', 'c']);
  });

  it('calls onRetry before each retry pass', async () => {
    const results = [undefined, 'b', undefined];
    const list = ['x', 'y', 'z'];
    const process = vi.fn().mockResolvedValue(['X', 'Z']);
    const onRetry = vi.fn();

    await retryUndefined(results, list, process, 3, onRetry);

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, ['x', 'z']);
  });

  it('works with maxAttempts of 1 (no retries)', async () => {
    const results = [undefined];
    const list = ['x'];
    const process = vi.fn();

    const attempts = await retryUndefined(results, list, process, 1);

    expect(attempts).toBe(0);
    expect(process).not.toHaveBeenCalled();
  });

  it('preserves original indices when filling sparse gaps', async () => {
    const results = ['a', undefined, 'c', undefined, 'e', undefined];
    const list = ['1', '2', '3', '4', '5', '6'];
    const process = vi.fn().mockResolvedValue(['B', 'D', 'F']);

    await retryUndefined(results, list, process, 2);

    expect(process).toHaveBeenCalledWith(['2', '4', '6'], 1);
    expect(results).toEqual(['a', 'B', 'c', 'D', 'e', 'F']);
  });

  it('passes attempt number to process function for caller config', async () => {
    const results = [undefined];
    const list = ['x'];
    const attemptsSeen = [];
    const process = vi.fn().mockImplementation(async (_items, attempt) => {
      attemptsSeen.push(attempt);
      return [attempt === 2 ? 'done' : undefined];
    });

    await retryUndefined(results, list, process, 4);

    expect(attemptsSeen).toEqual([1, 2]);
    expect(results).toEqual(['done']);
  });
});
