export default async (fn, { maxRetries=3, retryDelay=1000 }={}) => {
  let retries = 0;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  while (retries < maxRetries) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        retries++;
        await sleep(retryDelay * retries);
      } else {
        throw error;
      }
    }
  }

  throw new Error('Max retries reached');
}
