import { describe, expect, it, vi } from 'vitest';

import retry from './index.js';

const retryDelayGlobal = 10;

const mockFn = async () => {
  return 'Success';
};

const errorMessage429 = 'The server had an error \
while processing your request. Sorry about that! \
(status: 429, type: server_error)'

const mockFnWithError = async () => {
  const error = new Error(errorMessage429);
  error.response = { status: 429 };
  throw error;
};

const mockFnWithOtherError = async () => {
  const error = new Error('Error 500');
  error.response = { status: 500 };
  throw error;
};

describe('Retry', () => {

  it('Succeeds on first attempt', async () => {
    const result = await retry(mockFn);
    expect(result).toStrictEqual('Success');
  });

  it('Succeeds after retrying', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      if (callCount === 1) {
        throw { response: { status: 429 } };
      }
      return 'Success';
    };

    const result = await retry(fn, { retryDelay: retryDelayGlobal });
    expect(result).toStrictEqual('Success');
  });

  it('Fails after maxRetries', async ({ assert }) => {
    const maxRetries = 2;
    let callCount = 0;

    const fn = async () => {
      callCount++;
      throw { response: { status: 429 } };
    };

    try {
      await retry(fn, { maxRetries, retryDelay: retryDelayGlobal });
    } catch (error) {
      expect(error.message).toStrictEqual('Max retries reached');
      expect(callCount).toStrictEqual(maxRetries);
    }
  });

  it('Throws non-retryable error', async ({ assert }) => {
    try {
      await retry(mockFnWithOtherError);
    } catch (error) {
      expect(error.message).toStrictEqual('Error 500');
      expect(error.response.status).toStrictEqual(500);
    }
  });
});
