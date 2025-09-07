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

  it('Fails after maxRetries', async () => {
    const maxRetries = 2;
    let callCount = 0;

    const fn = async () => {
      callCount += 1;
      const error = new Error('Error 429');
      error.response = { status: 429 };
      throw error;
    };

    const promise = retry(fn, { maxRetries, retryDelay: retryDelayGlobal });
    // Attach handler immediately to prevent unhandled rejection
    promise.catch(() => {}); // Ignore error here, we'll check it below
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow('Error 429');
    expect(callCount).toStrictEqual(maxRetries + 1);
  });

  it('Throws non-retryable error', async () => {
    const mockFnWithOtherError = () => {
      throw new Error('Error 500');
    };

    const promise = retry(mockFnWithOtherError, { retryDelay: retryDelayGlobal });
    // Attach handler immediately to prevent unhandled rejection
    promise.catch(() => {}); // Ignore error here, we'll check it below
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow('Error 500');
  });

  it('Retries on all errors when retryOnAll is true', async () => {
    let callCount = 0;
    const maxRetries = 2;
    const fn = async () => {
      callCount += 1;
      const error = new Error('Error 500');
      error.response = { status: 500 };
      throw error;
    };

    const promise = retry(fn, {
      maxRetries,
      retryDelay: retryDelayGlobal,
      retryOnAll: true,
    });
    // Attach handler immediately to prevent unhandled rejection
    promise.catch(() => {}); // Ignore error here, we'll check it below
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow('Error 500');
    expect(callCount).toStrictEqual(maxRetries + 1);
  });
});
