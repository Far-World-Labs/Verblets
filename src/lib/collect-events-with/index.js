import { ChainEvent } from '../progress/constants.js';

/**
 * Run a function with a progress callback that captures named fields
 * from domain events. Returns the function's result alongside the
 * captured artifacts.
 *
 * Usage:
 *   const [result, { specification }] = await collectEventsWith(
 *     (onProgress) => chain(items, instruction, { onProgress }),
 *     'specification',
 *   );
 *
 * Compose with an existing callback inside the wrapper:
 *   const [result, captured] = await collectEventsWith(
 *     (onProgress) => chain(items, instruction, {
 *       onProgress: (e) => { onProgress(e); existingCallback(e); },
 *     }),
 *     'specification',
 *   );
 *
 * @param {Function} fn - Receives onProgress callback, returns a promise
 * @param {...string} fields - Event property names to collect
 * @returns {Promise<[*, object]>} Tuple of [fn result, captured fields]
 */
export default async function collectEventsWith(fn, ...fields) {
  let resolve;
  const captured = new Promise((r) => {
    resolve = r;
  });
  const derived = {};

  const onProgress = (event) => {
    for (const field of fields) {
      if (event[field] !== undefined) derived[field] = event[field];
    }
    if (event.event === ChainEvent.complete || event.event === ChainEvent.error) {
      resolve(derived);
    }
  };

  const result = await fn(onProgress);
  const artifacts = await captured;
  return [result, artifacts];
}
