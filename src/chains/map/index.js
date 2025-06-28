import listMapLines from '../../verblets/list-map-lines/index.js';

/**
 * Map over a list of fragments by calling `listMapLines` on newline-delimited batches.
 * Missing or mismatched output results in `undefined` entries so callers can
 * selectively retry.
 *
 * @param { string[] } list - array of fragments to process
 * @param { string } instructions - mapping instructions passed to `listMapLines`
 * @param { object } [config={}] - configuration options
 * @param { number } [config.chunkSize=10] - how many items to send per batch
 * @param { object } [config.llm] - LLM configuration
 * @returns { Promise<(string|undefined)[]> } results aligned with input order
 */
const mapOnce = async function (list, instructions, config = {}) {
  const { chunkSize = 10, llm, ...options } = config;
  const results = new Array(list.length);
  const promises = [];

  for (let i = 0; i < list.length; i += chunkSize) {
    const batch = list.slice(i, i + chunkSize);
    const startIndex = i;

    const p = Promise.resolve()
      .then(() => listMapLines(batch, instructions, { llm, ...options }))
      .then((output) => {
        if (output.length !== batch.length) {
          for (let j = 0; j < batch.length; j += 1) {
            results[startIndex + j] = undefined;
          }
          return;
        }
        output.forEach((line, j) => {
          results[startIndex + j] = line;
        });
      })
      .catch(() => {
        for (let j = 0; j < batch.length; j += 1) {
          results[startIndex + j] = undefined;
        }
      });
    promises.push(p);
  }

  await Promise.all(promises);
  return results;
};

/**
 * Map over a list of fragments with retry support (default export).
 * Retry undefined results until maxAttempts is reached.
 *
 * @param { string[] } list - array of fragments
 * @param { string } instructions - mapping instructions passed to `listMapLines`
 * @param { object } [config={}] - configuration options
 * @param { number } [config.chunkSize=10]
 * @param { number } [config.maxAttempts=3]
 * @param { object } [config.llm] - LLM configuration
 * @returns { Promise<(string|undefined)[]> }
 */
const map = async function (list, instructions, config = {}) {
  const { chunkSize = 10, maxAttempts = 3, llm, ...options } = config;
  const results = await mapOnce(list, instructions, { chunkSize, llm, ...options });
  for (let attempt = 1; attempt < maxAttempts; attempt += 1) {
    const missingIdx = [];
    const missingFragments = [];
    results.forEach((val, idx) => {
      if (val === undefined) {
        missingIdx.push(idx);
        missingFragments.push(list[idx]);
      }
    });
    if (missingFragments.length === 0) break;
    // eslint-disable-next-line no-await-in-loop
    const retryResults = await mapOnce(missingFragments, instructions, {
      chunkSize,
      llm,
      ...options,
    });
    retryResults.forEach((val, i) => {
      results[missingIdx[i]] = val;
    });
  }
  return results;
};

export { mapOnce };
export default map;
