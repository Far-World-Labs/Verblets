import { afterEach, describe, expect, it, vi } from 'vitest';

import withInactivityTimeout from './index.js';

describe('withInactivityTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves when work completes before timeout', async () => {
    const result = await withInactivityTimeout(async () => 'done', 1000);
    expect(result).toBe('done');
  });

  it('rejects when work is inactive beyond timeout', async () => {
    vi.useFakeTimers();
    const promise = withInactivityTimeout(
      () => new Promise(() => {}), // never resolves
      50
    );
    vi.advanceTimersByTime(50);
    await expect(promise).rejects.toThrow('Inactivity timeout');
  });

  it('resets timer when onUpdate is called', async () => {
    vi.useFakeTimers();
    const promise = withInactivityTimeout(async (onUpdate) => {
      // Simulate work that updates periodically
      await vi.advanceTimersByTimeAsync(40);
      onUpdate('progress');
      await vi.advanceTimersByTimeAsync(40);
      onUpdate('more progress');
      await vi.advanceTimersByTimeAsync(40);
      return 'completed';
    }, 50);

    const result = await promise;
    expect(result).toBe('completed');
  });

  it('propagates errors from work function', async () => {
    await expect(
      withInactivityTimeout(async () => {
        throw new Error('work failed');
      }, 1000)
    ).rejects.toThrow('work failed');
  });

  it('calls hook with update data', async () => {
    const hookCalls = [];
    const hook = (input, error) => hookCalls.push({ input, error });

    await withInactivityTimeout(
      async (onUpdate) => {
        onUpdate('step-1');
        onUpdate('step-2', new Error('warning'));
        return 'result';
      },
      1000,
      hook
    );

    expect(hookCalls).toEqual([
      { input: 'step-1', error: undefined },
      { input: 'step-2', error: expect.any(Error) },
    ]);
  });

  it('includes timeout duration in error message', async () => {
    vi.useFakeTimers();
    const promise = withInactivityTimeout(() => new Promise(() => {}), 250);
    vi.advanceTimersByTime(250);
    await expect(promise).rejects.toThrow('250ms');
  });
});
