import { describe, expect, it } from 'vitest';

import retry from './index.js';

const retryDelayGlobal = 10;

const mockFn = () => {
  return 'Success';
};

describe('Retry', () => {
  it('Succeeds on first attempt', async () => {
    const result = await retry(mockFn, { retryDelay: retryDelayGlobal });
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

    const result = await retry(fn, { retryDelay: retryDelayGlobal });
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

    try {
      await retry(fn, { maxRetries, retryDelay: retryDelayGlobal });
    } catch (error) {
      expect(error.message).toStrictEqual('Error 429');
      expect(callCount).toStrictEqual(maxRetries + 1);
    }
  });

  it('Throws non-retryable error', async () => {
    const mockFnWithOtherError = () => {
      throw new Error('Error 500');
    };

    try {
      await retry(mockFnWithOtherError, { retryDelay: retryDelayGlobal });
    } catch (error) {
      expect(error.message).toStrictEqual('Error 500');
    }
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

    try {
      await retry(fn, {
        maxRetries,
        retryDelay: retryDelayGlobal,
        retryOnAll: true,
      });
    } catch (error) {
      expect(error.message).toStrictEqual('Error 500');
      expect(callCount).toStrictEqual(maxRetries + 1);
    }
  });
});
