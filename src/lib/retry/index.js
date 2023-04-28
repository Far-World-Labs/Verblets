/* eslint-disable no-await-in-loop */
import { errorMaxRetries } from '../../constants/messages.js';

export default async (fn, { maxRetries = 3, retryDelay = 1000 } = {}) => {
  let retries = 0;

  // eslint-disable-next-line no-promise-executor-return
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  while (retries < maxRetries) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        retries += 1;
        await sleep(retryDelay * retries);
      } else {
        throw error;
      }
    }
  }

  throw new Error(errorMaxRetries);
};
