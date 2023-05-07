/* eslint-disable no-await-in-loop */
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
    retryOnAll = true,
  } = {}
) => {
  let retry = 0;
  let lastError = new Error('Nothing to run');

  // eslint-disable-next-line no-promise-executor-return
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const labelDisplay = label ? `"${label}"` : '';

  while (retry <= maxRetries) {
    try {
      if (label) {
        const variables = [`retry: ${retry}`].join(', ');
        const startTag = `${retry > 0 ? 'retry' : 'started'}`;
        const startVariablesDisplay = `${retry > 0 ? ` (${variables})` : ''}`;
        console.error(
          `Run ${labelDisplay} [${startTag}]${startVariablesDisplay}`
        );
      }

      const result = await fn();

      if (label) {
        console.error(`Run ${labelDisplay} [complete]`);
      }

      return result;
    } catch (error) {
      lastError = error;

      const isRetry =
        retryOnAll || (error.response && error.response.status === 429);

      if (isRetry) {
        await sleep(retryDelay * retry);
        retry += 1;
      } else {
        retry = maxRetries;
      }
      const doneTag = `${retry >= maxRetries ? 'abort' : 'retry'}`;

      if (label) {
        console.error(`Run ${labelDisplay} [${doneTag}]: ${error.message}`);
      }
    }
  }

  throw lastError;
};
