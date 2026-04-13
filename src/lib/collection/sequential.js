import createProgressEmitter from '../progress/index.js';
import { Outcome } from '../progress/constants.js';

/**
 * Sequential map — apply fn to each item one at a time.
 * @param {Function} fn - async (item, index) → result
 * @param {Array} items
 * @param {object} [opts]
 * @param {AbortSignal} [opts.abortSignal]
 * @param {Function} [opts.onProgress]
 * @param {string} [opts.label='mapEach']
 * @returns {Promise<Array>} results aligned with input order
 */
export async function map(fn, items, opts = {}) {
  const { abortSignal, onProgress, label = 'mapEach' } = opts;

  if (!items || items.length === 0) return [];

  const emitter = createProgressEmitter(label, onProgress);
  emitter.start();
  const batchDone = emitter.batch(items.length);
  const results = new Array(items.length);

  try {
    for (let i = 0; i < items.length; i++) {
      if (abortSignal?.aborted) throw abortSignal.reason ?? new Error('Aborted');
      results[i] = await fn(items[i], i);
      batchDone(1);
    }

    emitter.complete({ outcome: Outcome.success, totalItems: items.length });
    return results;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

/**
 * Sequential filter — keep items where fn returns truthy, one at a time.
 * @param {Function} fn - async (item, index) → truthy/falsy
 * @param {Array} items
 * @param {object} [opts]
 * @returns {Promise<Array>} subset of items
 */
export async function filter(fn, items, opts = {}) {
  const { abortSignal, onProgress, label = 'filterEach' } = opts;

  if (!items || items.length === 0) return [];

  const emitter = createProgressEmitter(label, onProgress);
  emitter.start();
  const batchDone = emitter.batch(items.length);
  const result = [];

  try {
    for (let i = 0; i < items.length; i++) {
      if (abortSignal?.aborted) throw abortSignal.reason ?? new Error('Aborted');
      if (await fn(items[i], i)) {
        result.push(items[i]);
      }
      batchDone(1);
    }

    emitter.complete({ outcome: Outcome.success, totalItems: items.length, kept: result.length });
    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

/**
 * Sequential find — return first item where fn returns truthy.
 * @param {Function} fn - async (item, index) → truthy/falsy
 * @param {Array} items
 * @param {object} [opts]
 * @returns {Promise<*|undefined>} first matching item or undefined
 */
export async function find(fn, items, opts = {}) {
  const { abortSignal, onProgress, label = 'findEach' } = opts;

  if (!items || items.length === 0) return undefined;

  const emitter = createProgressEmitter(label, onProgress);
  emitter.start();
  const batchDone = emitter.batch(items.length);

  try {
    for (let i = 0; i < items.length; i++) {
      if (abortSignal?.aborted) throw abortSignal.reason ?? new Error('Aborted');
      if (await fn(items[i], i)) {
        batchDone(1);
        emitter.complete({ outcome: Outcome.success, found: true });
        return items[i];
      }
      batchDone(1);
    }

    emitter.complete({ outcome: Outcome.success, found: false });
    return undefined;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

/**
 * Sequential reduce — accumulate across items.
 * @param {Function} fn - async (acc, item, index) → newAcc
 * @param {Array} items
 * @param {*} initial - initial accumulator value
 * @param {object} [opts]
 * @returns {Promise<*>} final accumulator
 */
export async function reduce(fn, items, initial, opts = {}) {
  const { abortSignal, onProgress, label = 'reduceEach' } = opts;

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
 * Sequential group — partition items by key, one at a time.
 * @param {Function} fn - async (item, index) → groupKey
 * @param {Array} items
 * @param {object} [opts]
 * @returns {Promise<Object>} { [key]: item[] }
 */
export async function group(fn, items, opts = {}) {
  const { abortSignal, onProgress, label = 'groupEach' } = opts;

  if (!items || items.length === 0) return {};

  const emitter = createProgressEmitter(label, onProgress);
  emitter.start();
  const batchDone = emitter.batch(items.length);
  const groups = {};

  try {
    for (let i = 0; i < items.length; i++) {
      if (abortSignal?.aborted) throw abortSignal.reason ?? new Error('Aborted');
      const key = String((await fn(items[i], i)) ?? 'other');
      if (!groups[key]) groups[key] = [];
      groups[key].push(items[i]);
      batchDone(1);
    }

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
