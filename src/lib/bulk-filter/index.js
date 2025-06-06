import listFilter from '../../verblets/list-filter/index.js';

/**
 * Filter a list by processing newline-delimited batches with `listFilter`.
 *
 * @param {string[]} list - array of items to evaluate
 * @param {string} instructions - filter instructions for `listFilter`
 * @param {number} [chunkSize=10] - how many items per batch
 * @returns {Promise<string[]>} filtered items preserving order
 */
export default async function bulkFilter(list, instructions, chunkSize = 10) {
  const batches = [];
  for (let i = 0; i < list.length; i += chunkSize) {
    const batch = list.slice(i, i + chunkSize);
    const filtered = await listFilter(batch, instructions);
    batches.push(filtered);
  }
  return batches.flat();
}

/**
 * Retry filtering failed batches until `maxAttempts` is reached.
 *
 * @param {string[]} list
 * @param {string} instructions
 * @param {object} [options]
 * @param {number} [options.chunkSize=10]
 * @param {number} [options.maxAttempts=3]
 * @returns {Promise<string[]>}
 */
export async function bulkFilterRetry(
  list,
  instructions,
  { chunkSize = 10, maxAttempts = 3 } = {}
) {
  const batches = [];
  for (let i = 0; i < list.length; i += chunkSize) {
    batches.push(list.slice(i, i + chunkSize));
  }
  const results = new Array(batches.length).fill(null);
  let pending = batches.map((_, idx) => idx);

  for (let attempt = 0; attempt < maxAttempts && pending.length > 0; attempt += 1) {
    const newPending = [];
    for (const idx of pending) {
      const batch = batches[idx];
      try {
        const filtered = await listFilter(batch, instructions);
        const valid = filtered.every((line) => batch.includes(line));
        if (valid) {
          results[idx] = filtered;
        } else {
          newPending.push(idx);
        }
      } catch {
        newPending.push(idx);
      }
    }
    pending = newPending;
  }

  return results.flat().filter(Boolean);
}
