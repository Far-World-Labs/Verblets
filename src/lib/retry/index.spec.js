import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import retry from './index.js';

const retryDelayGlobal = 10;

const mockFn = () => {
  return 'Success';
};

describe('Retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Succeeds on first attempt', async () => {
    const promise = retry(mockFn, { retryDelay: retryDelayGlobal });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toStrictEqual('Success');
  });

  it('Succeeds after retrying', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount += 1;
      if (callCount === 1) {
        const error = new Error('Error 429');
        error.response = { status: 429 };
        throw error;
      }
      return 'Success';
    };

    const promise = retry(fn, { retryDelay: retryDelayGlobal });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toStrictEqual('Success');
    expect(callCount).toStrictEqual(2);
  });

  it('Fails after maxAttempts', async () => {
    const maxAttempts = 3;
    let callCount = 0;

    const fn = async () => {
      callCount += 1;
      const error = new Error('Error 429');
      error.response = { status: 429 };
      throw error;
    };

    const promise = retry(fn, { maxAttempts, retryDelay: retryDelayGlobal });
    promise.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow('Error 429');
    expect(callCount).toStrictEqual(maxAttempts);
  });

  it('Throws non-retryable error', async () => {
    const mockFnWithOtherError = () => {
      throw new Error('Error 500');
    };

    const promise = retry(mockFnWithOtherError, { retryDelay: retryDelayGlobal });
    promise.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow('Error 500');
  });

  it('Retries on all errors when retryOnAll is true', async () => {
    let callCount = 0;
    const maxAttempts = 3;
    const fn = async () => {
      callCount += 1;
      const error = new Error('Error 500');
      error.response = { status: 500 };
      throw error;
    };

    const promise = retry(fn, {
      maxAttempts,
      retryDelay: retryDelayGlobal,
      retryOnAll: true,
    });
    promise.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow('Error 500');
    expect(callCount).toStrictEqual(maxAttempts);
  });

  it('emits onProgress events', async () => {
    const onProgress = vi.fn();

    const promise = retry(mockFn, {
      label: 'test',
      retryDelay: retryDelayGlobal,
      onProgress,
    });
    await vi.runAllTimersAsync();
    await promise;

    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ step: 'test', event: 'start' })
    );
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ step: 'test', event: 'complete', success: true })
    );
  });

  it('calls fn with no arguments', async () => {
    const fn = vi.fn().mockResolvedValue('result');

    const promise = retry(fn, { retryDelay: retryDelayGlobal });
    await vi.runAllTimersAsync();
    await promise;

    expect(fn).toHaveBeenCalledWith();
  });

  describe('abortSignal support', () => {
    it('throws immediately when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        retry(mockFn, { retryDelay: retryDelayGlobal, abortSignal: controller.signal })
      ).rejects.toThrow('aborted');
    });

    it('aborts during sleep between retries', async () => {
      vi.useRealTimers();
      const controller = new AbortController();
      let callCount = 0;

      const fn = async () => {
        callCount += 1;
        const error = new Error('Retriable');
        error.response = { status: 429 };
        throw error;
      };

      // Abort after 10ms — sleep(retryDelay * attempt) starts at 0ms for attempt 0,
      // then 100ms for attempt 1, so abort fires during the second sleep
      setTimeout(() => controller.abort(), 10);

      await expect(
        retry(fn, { retryDelay: 100, maxAttempts: 5, abortSignal: controller.signal })
      ).rejects.toThrow('aborted');

      // First attempt: sleep(0) = instant, second attempt: sleep(100) interrupted at 10ms
      expect(callCount).toBe(2);
    });

    it('does not abort if signal is never triggered', async () => {
      const controller = new AbortController();

      const promise = retry(mockFn, {
        retryDelay: retryDelayGlobal,
        abortSignal: controller.signal,
      });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('Success');
    });

    it('aborts before second attempt when signal fires between attempts', async () => {
      vi.useRealTimers();
      const controller = new AbortController();
      let callCount = 0;

      const fn = async () => {
        callCount += 1;
        if (callCount === 1) {
          // Abort immediately after first failure
          controller.abort();
          const error = new Error('Retriable');
          error.response = { status: 429 };
          throw error;
        }
        return 'Should not reach';
      };

      await expect(
        retry(fn, { retryDelay: 100, maxAttempts: 5, abortSignal: controller.signal })
      ).rejects.toThrow('aborted');

      expect(callCount).toBe(1);
    });
  });
});
