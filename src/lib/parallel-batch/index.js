import { chunk } from '../pure/index.js';

/**
 * Process items in parallel batches with controlled concurrency
 *
 * @param {Array} items - Items to process
 * @param {Function} processor - Async function to process each item
 * @param {Object} options - Options
 * @param {number} options.maxParallel - Maximum parallel executions (default: 3)
 * @param {string} options.label - Label for debugging (optional)
 * @returns {Promise<Array>} Results in same order as input items
 */
export async function parallelBatch(items, processor, options = {}) {
  const { maxParallel = 3 } = options;

  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const results = [];
  const batches = chunk(maxParallel)(items);
  let offset = 0;

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map((item, index) => processor(item, offset + index))
    );
    results.push(...batchResults);
    offset += batch.length;
  }

  return results;
}

/**
 * Map items through an async processor with controlled parallelism
 * Alias for parallelBatch with clearer naming for map operations
 */
export const parallelMap = parallelBatch;

export default parallelBatch;
