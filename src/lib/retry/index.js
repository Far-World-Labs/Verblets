import { defaultMaxAttempts, retryDelay as retryDelayDefault } from '../../constants/common.js';
import emitProgress from '../progress-callback/index.js';

const abortError = (signal) => signal?.reason ?? new Error('The operation was aborted.');

async function retry(fn, opts = {}) {
  const {
    label = '',
    maxAttempts = defaultMaxAttempts,
    retryDelay = retryDelayDefault,
    retryOnAll = false,
    onProgress,
    abortSignal,
  } = opts;

  let attempt = 0;
  let lastError = new Error('Nothing to run');

  const sleep = (ms) =>
    new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(abortError(abortSignal));
        return;
      }
      const timer = setTimeout(resolve, ms);
      abortSignal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(abortError(abortSignal));
        },
        { once: true }
      );
    });

  if (onProgress) {
    emitProgress({
      callback: onProgress,
      step: label || 'retry',
      event: 'start',
      attemptNumber: 1,
      maxAttempts,
      retryOnAll,
    });
  }

  while (attempt < maxAttempts) {
    if (abortSignal?.aborted) {
      throw abortError(abortSignal);
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await fn();

      if (onProgress) {
        emitProgress({
          callback: onProgress,
          step: label || 'retry',
          event: 'complete',
          attemptNumber: attempt + 1,
          maxAttempts,
          success: true,
          totalAttempts: attempt + 1,
        });
      }

      return result;
    } catch (error) {
      lastError = error;

      const status = error.response?.status;
      const isRetry = retryOnAll || status === 429 || (status >= 500 && status < 600);

      const isLastAttempt = !isRetry || attempt >= maxAttempts - 1;

      if (isRetry && attempt < maxAttempts - 1) {
        if (onProgress) {
          const progressData = {
            callback: onProgress,
            step: label || 'retry',
            event: 'retry',
            attemptNumber: attempt + 1,
            maxAttempts,
            delay: retryDelay * attempt,
            error: error.message,
          };

          if (attempt + 1 < maxAttempts - 1) {
            progressData.nextAttempt = attempt + 2;
          }

          emitProgress(progressData);
        }

        // eslint-disable-next-line no-await-in-loop
        await sleep(retryDelay * attempt);
        attempt += 1;
      } else {
        attempt = maxAttempts;

        if (onProgress && isLastAttempt) {
          emitProgress({
            callback: onProgress,
            step: label || 'retry',
            event: 'error',
            attemptNumber: attempt + 1,
            maxAttempts,
            error: error.message,
            totalAttempts: attempt + 1,
            final: true,
          });
        }
      }
    }
  }

  throw lastError;
}

export default retry;
