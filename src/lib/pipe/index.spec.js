import { describe, expect, it } from 'vitest';

import pipe from './index.js';

describe('pipe', () => {
  it('passes value through sync functions', async () => {
    const result = await pipe(
      [1, 2, 3],
      (arr) => arr.map((x) => x * 2),
      (arr) => arr.filter((x) => x > 2)
    );
    expect(result).toEqual([4, 6]);
  });

  it('passes value through async functions', async () => {
    const asyncDouble = async (arr) => arr.map((x) => x * 2);
    const asyncFilter = async (arr) => arr.filter((x) => x > 4);

    const result = await pipe([1, 2, 3], asyncDouble, asyncFilter);
    expect(result).toEqual([6]);
  });

  it('handles tuple form [fn, ...args]', async () => {
    const add = (arr, n) => arr.map((x) => x + n);
    const multiply = (arr, n) => arr.map((x) => x * n);

    const result = await pipe([1, 2, 3], [add, 10], [multiply, 2]);
    expect(result).toEqual([22, 24, 26]);
  });

  it('mixes sync, async, and tuple forms', async () => {
    const asyncMap = async (arr, fn) => arr.map(fn);
    const compact = (arr) => arr.filter((x) => x != null);

    const result = await pipe([1, null, 2, undefined, 3], compact, [asyncMap, (x) => x * 10]);
    expect(result).toEqual([10, 20, 30]);
  });

  it('returns initial value when no steps provided', async () => {
    const result = await pipe([1, 2, 3]);
    expect(result).toEqual([1, 2, 3]);
  });

  it('works with single step', async () => {
    const result = await pipe('hello', (s) => s.toUpperCase());
    expect(result).toBe('HELLO');
  });

  it('works with non-array values', async () => {
    const result = await pipe(
      5,
      (n) => n * 2,
      (n) => n + 1,
      (n) => String(n)
    );
    expect(result).toBe('11');
  });

  it('propagates errors from steps', async () => {
    const failing = () => {
      throw new Error('step failed');
    };
    await expect(pipe(1, failing)).rejects.toThrow('step failed');
  });

  it('propagates errors from async steps', async () => {
    const asyncFailing = async () => {
      throw new Error('async step failed');
    };
    await expect(pipe(1, asyncFailing)).rejects.toThrow('async step failed');
  });
});
