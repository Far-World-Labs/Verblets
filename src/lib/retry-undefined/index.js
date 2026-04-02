/**
 * Retry undefined entries in a results array by re-processing the
 * corresponding source items.  Shared by chains that batch-process
 * lists and need to backfill gaps left by transient failures.
 *
 * @param {Array} results   - Mutable results array (modified in place)
 * @param {Array} list      - Original input items (same length as results)
 * @param {Function} process - (missingItems, attempt) => Promise<Array>
 * @param {number} maxAttempts - Total attempts including the initial pass
 * @param {Function} [onRetry] - (attempt, missingItems) => void — called before each retry
 * @returns {Promise<number>} Number of retry passes actually executed
 */
async function retryUndefined(results, list, process, maxAttempts, onRetry) {
  let retryAttempts = 0;

  for (let attempt = 1; attempt < maxAttempts; attempt += 1) {
    const missingIdx = [];
    const missingItems = [];

    results.forEach((val, idx) => {
      if (val === undefined) {
        missingIdx.push(idx);
        missingItems.push(list[idx]);
      }
    });

    if (missingItems.length === 0) break;
    retryAttempts += 1;

    if (onRetry) onRetry(attempt, missingItems);

    // eslint-disable-next-line no-await-in-loop
    const retryResults = await process(missingItems, attempt);

    retryResults.forEach((val, i) => {
      if (val !== undefined) results[missingIdx[i]] = val;
    });
  }

  return retryAttempts;
}

export default retryUndefined;
