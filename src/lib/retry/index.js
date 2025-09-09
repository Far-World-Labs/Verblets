import {
  maxRetries as maxRetriesDefault,
  retryDelay as retryDelayDefault,
} from '../../constants/common.js';
import emitProgress from '../progress-callback/index.js';

export default async (
  fn,
  {
    label = '',
    maxAttempts = maxRetriesDefault + 1,
    retryDelay = retryDelayDefault,
    retryOnAll = false,
    chatGPTPrompt = undefined,
    chatGPTConfig = undefined,
    onProgress = undefined,
  } = {}
) => {
  let attempt = 0;
  let lastError = new Error('Nothing to run');

  const sleep = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
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
    try {
      // eslint-disable-next-line no-await-in-loop
      const result =
        chatGPTPrompt !== undefined ? await fn(chatGPTPrompt, chatGPTConfig) : await fn();

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

      const isRetry = retryOnAll || (error.response && error.response.status === 429);

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
};
