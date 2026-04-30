import { chunk } from '../pure/index.js';
import createProgressEmitter from '../progress/index.js';
import { Outcome, ErrorPosture } from '../progress/constants.js';

/**
 * Parallel map — apply fn to each item with controlled concurrency.
 * @param {Function} fn - async (item, index) → result
 * @param {Array} items - items to process
 * @param {object} [opts]
 * @param {number} [opts.maxParallel=3]
 * @param {string} [opts.errorPosture='resilient']
 * @param {AbortSignal} [opts.abortSignal]
 * @param {Function} [opts.onProgress]
 * @param {string} [opts.label='pMap']
 * @returns {Promise<Array>} results aligned with input order; undefined for failed slots in resilient mode
 */
export async function map(fn, items, opts = {}) {
  const {
    maxParallel = 3,
    errorPosture = ErrorPosture.resilient,
    abortSignal,
    onProgress,
    label = 'pMap',
  } = opts;

  if (!items || items.length === 0) return [];

  const emitter = createProgressEmitter(label, onProgress);
  emitter.start();
  const batchDone = emitter.batch(items.length);
  const results = new Array(items.length);
  const batches = chunk(maxParallel)(items);
  let offset = 0;

  try {
    for (const batch of batches) {
      if (abortSignal?.aborted) throw abortSignal.reason ?? new Error('Aborted');

      const promises = batch.map(async (item, i) => {
        const idx = offset + i;
        try {
          results[idx] = await fn(item, idx);
        } catch (err) {
          if (errorPosture === ErrorPosture.strict) throw err;
          results[idx] = undefined;
        }
        batchDone(1);
      });

      if (errorPosture === ErrorPosture.strict) {
        await Promise.all(promises);
      } else {
        await Promise.allSettled(promises);
      }

      offset += batch.length;
    }

    emitter.complete({ outcome: Outcome.success, totalItems: items.length });
    return results;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

/**
 * Parallel filter — keep items where fn returns truthy.
 * @param {Function} fn - async (item, index) → truthy/falsy
 * @param {Array} items
 * @param {object} [opts] — same as map
 * @returns {Promise<Array>} subset of items
 */
export async function filter(fn, items, opts = {}) {
  const {
    maxParallel = 3,
    errorPosture = ErrorPosture.resilient,
    abortSignal,
    onProgress,
    label = 'pFilter',
  } = opts;

  if (!items || items.length === 0) return [];

  const emitter = createProgressEmitter(label, onProgress);
  emitter.start();
  const batchDone = emitter.batch(items.length);
  const decisions = new Array(items.length);
  const batches = chunk(maxParallel)(items);
  let offset = 0;

  try {
    for (const batch of batches) {
      if (abortSignal?.aborted) throw abortSignal.reason ?? new Error('Aborted');

      const promises = batch.map(async (item, i) => {
        const idx = offset + i;
        try {
          decisions[idx] = await fn(item, idx);
        } catch (err) {
          if (errorPosture === ErrorPosture.strict) throw err;
          decisions[idx] = false;
        }
        batchDone(1);
      });

      if (errorPosture === ErrorPosture.strict) {
        await Promise.all(promises);
      } else {
        await Promise.allSettled(promises);
      }

      offset += batch.length;
    }

    const result = items.filter((_, i) => decisions[i]);
    emitter.complete({ outcome: Outcome.success, totalItems: items.length, kept: result.length });
    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

/**
 * Parallel find — return first item where fn returns truthy.
 * Processes in chunks of maxParallel, stops after first match.
 * @param {Function} fn - async (item, index) → truthy/falsy
 * @param {Array} items
 * @param {object} [opts]
 * @returns {Promise<*|undefined>} first matching item or undefined
 */
export async function find(fn, items, opts = {}) {
  const {
    maxParallel = 3,
    errorPosture = ErrorPosture.resilient,
    abortSignal,
    onProgress,
    label = 'pFind',
  } = opts;

  if (!items || items.length === 0) return undefined;

  const emitter = createProgressEmitter(label, onProgress);
  emitter.start();
  const batchDone = emitter.batch(items.length);
  const batches = chunk(maxParallel)(items);
  let offset = 0;

  try {
    for (const batch of batches) {
      if (abortSignal?.aborted) throw abortSignal.reason ?? new Error('Aborted');

      const results = new Array(batch.length);

      const promises = batch.map(async (item, i) => {
        try {
          results[i] = { item, matched: await fn(item, offset + i) };
        } catch (err) {
          if (errorPosture === ErrorPosture.strict) throw err;
          results[i] = { item, matched: false };
        }
        batchDone(1);
      });

      if (errorPosture === ErrorPosture.strict) {
        await Promise.all(promises);
      } else {
        await Promise.allSettled(promises);
      }

      // Check for match in input order within this batch
      const match = results.find((r) => r.matched);
      if (match) {
        emitter.complete({ outcome: Outcome.success, found: true });
        return match.item;
      }

      offset += batch.length;
    }

    emitter.complete({ outcome: Outcome.success, found: false });
    return undefined;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

/**
 * Reduce — always sequential (accumulator threading requires order).
 * Included here for API completeness; parallelism applies to the fn calls
 * themselves but items are processed one at a time.
 * @param {Function} fn - async (acc, item, index) → newAcc
 * @param {Array} items
 * @param {*} initial - initial accumulator value
 * @param {object} [opts]
 * @returns {Promise<*>} final accumulator
 */
export async function reduce(fn, items, initial, opts = {}) {
  const { abortSignal, onProgress, label = 'pReduce' } = opts;

  const emitter = createProgressEmitter(label, onProgress);
  emitter.start();
  const batchDone = emitter.batch(items.length);
  let acc = initial;

  try {
    for (let i = 0; i < items.length; i++) {
      if (abortSignal?.aborted) throw abortSignal.reason ?? new Error('Aborted');
      acc = await fn(acc, items[i], i);
      batchDone(1);
    }

    emitter.complete({ outcome: Outcome.success, totalItems: items.length });
    return acc;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

/**
 * Parallel group — partition items by key returned from fn.
 * @param {Function} fn - async (item, index) → groupKey
 * @param {Array} items
 * @param {object} [opts] — same as map
 * @returns {Promise<Object>} { [key]: item[] }
 */
export async function group(fn, items, opts = {}) {
  const {
    maxParallel = 3,
    errorPosture = ErrorPosture.resilient,
    abortSignal,
    onProgress,
    label = 'pGroup',
  } = opts;

  if (!items || items.length === 0) return {};

  const emitter = createProgressEmitter(label, onProgress);
  emitter.start();
  const batchDone = emitter.batch(items.length);
  const keys = new Array(items.length);
  const batches = chunk(maxParallel)(items);
  let offset = 0;

  try {
    for (const batch of batches) {
      if (abortSignal?.aborted) throw abortSignal.reason ?? new Error('Aborted');

      const promises = batch.map(async (item, i) => {
        const idx = offset + i;
        try {
          keys[idx] = await fn(item, idx);
        } catch (err) {
          if (errorPosture === ErrorPosture.strict) throw err;
          keys[idx] = 'other';
        }
        batchDone(1);
      });

      if (errorPosture === ErrorPosture.strict) {
        await Promise.all(promises);
      } else {
        await Promise.allSettled(promises);
      }

      offset += batch.length;
    }

    const groups = {};
    items.forEach((item, i) => {
      const key = String(keys[i] ?? 'other');
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    emitter.complete({
      outcome: Outcome.success,
      totalItems: items.length,
      groupCount: Object.keys(groups).length,
    });
    return groups;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
