import listMap from '../../verblets/list-map/index.js';

/**
 * Map over a list of fragments by calling `listMap` on newline-delimited batches.
 * Missing or mismatched output results in `undefined` entries so callers can
 * selectively retry.
 *
 * @param { string[] } list - array of fragments to process
 * @param { string } instructions - mapping instructions passed to `listMap`
 * @param { number } [chunkSize=10] - how many items to send per batch
 * @returns { Promise<(string|undefined)[]> } results aligned with input order
 */
async function bulkMap(list, instructions, chunkSize = 10) {
  const results = new Array(list.length);
  const promises = [];

  for (let i = 0; i < list.length; i += chunkSize) {
    const batch = list.slice(i, i + chunkSize);
    const startIndex = i;

    const p = Promise.resolve()
      .then(() => listMap(batch, instructions))
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
}

/**
 * Retry only the undefined results from `map` until maxAttempts is reached.
 *
 * @param { string[] } list - array of fragments
 * @param { string } instructions - mapping instructions passed to `listMap`
 * @param { object } [options]
 * @param { number } [options.chunkSize=10]
 * @param { number } [options.maxAttempts=3]
 * @returns { Promise<(string|undefined)[]> }
 */
export async function bulkMapRetry(list, instructions, { chunkSize = 10, maxAttempts = 3 } = {}) {
  const results = await bulkMap(list, instructions, chunkSize);
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
    const retryResults = await bulkMap(missingFragments, instructions, chunkSize);
    retryResults.forEach((val, i) => {
      results[missingIdx[i]] = val;
    });
  }
  return results;
}

export default bulkMap;
