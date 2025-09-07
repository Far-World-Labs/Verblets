import {
  maxRetries as maxRetriesDefault,
  retryDelay as retryDelayDefault,
} from '../../constants/common.js';

export default async (
  fn,
  {
    label = '',
    maxRetries = maxRetriesDefault,
    retryDelay = retryDelayDefault,
    retryOnAll = false,
    chatGPTPrompt = undefined,
    chatGPTConfig = undefined,
    logger = undefined,
  } = {}
) => {
  let retry = 0;
  let lastError = new Error('Nothing to run');

  const sleep = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const labelDisplay = label ? `"${label}"` : '';

  while (retry <= maxRetries) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result =
        chatGPTPrompt !== undefined ? await fn(chatGPTPrompt, chatGPTConfig) : await fn();

      return result;
    } catch (error) {
      lastError = error;

      const isRetry = retryOnAll || (error.response && error.response.status === 429);

      const isLastAttempt = !isRetry || retry >= maxRetries;

      if (isRetry && retry < maxRetries) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(retryDelay * retry);
        retry += 1;
      } else {
        retry = maxRetries + 1;
      }

      const doneTag = isLastAttempt ? 'abort' : 'retry';
      const attemptInfo = `attempt ${retry + 1}/${maxRetries + 1}`;

      if (label && isLastAttempt && logger?.error) {
        const message = `Run ${labelDisplay} [${doneTag}] after ${attemptInfo}: ${error.message}`;
        logger.error(message);

        // Always log context on final failure if provided
        if (chatGPTPrompt !== undefined) {
          const promptPreview =
            typeof chatGPTPrompt === 'string'
              ? chatGPTPrompt.length > 500
                ? `${chatGPTPrompt.substring(0, 500)}...`
                : chatGPTPrompt
              : JSON.stringify(chatGPTPrompt) || '';

          logger.error(
            'Failed prompt:',
            promptPreview.substring ? promptPreview.substring(0, 500) : promptPreview
          );
        }
        if (chatGPTConfig) {
          const configStr = JSON.stringify(chatGPTConfig) || '';
          logger.error(
            'Failed config:',
            configStr.substring ? configStr.substring(0, 500) : configStr
          );
        }
      }
    }
  }

  throw lastError;
};
