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

  const sleep = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const labelDisplay = label ? `"${label}"` : '';

  while (retry <= maxRetries) {
    try {
      if (label) {
        const variables = [`retry: ${retry}`].join(', ');
        const startTag = `${retry > 0 ? 'retry' : 'started'}`;
        const startVariablesDisplay = `${retry > 0 ? ` (${variables})` : ''}`;
        // eslint-disable-next-line no-console
        console.error(`Run ${labelDisplay} [${startTag}]${startVariablesDisplay}`);
      }

      // eslint-disable-next-line no-await-in-loop
      const result = await fn();

      if (label) {
        // eslint-disable-next-line no-console
        console.error(`Run ${labelDisplay} [complete]`);
      }

      return result;
    } catch (error) {
      lastError = error;

      const isRetry = retryOnAll || (error.response && error.response.status === 429);

      if (isRetry) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(retryDelay * retry);
        retry += 1;
      } else {
        retry = maxRetries;
      }
      const doneTag = `${retry >= maxRetries ? 'abort' : 'retry'}`;

      if (label) {
        // eslint-disable-next-line no-console
        console.error(`Run ${labelDisplay} [${doneTag}]: ${error.message}`);
      }
    }
  }

  throw lastError;
};
