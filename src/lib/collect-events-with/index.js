import { ChainEvent } from '../progress/constants.js';

/**
 * Create a progress callback that collects named fields from domain events,
 * resolving a promise when the chain completes.
 *
 * Usage:
 *   const onProgress = collectEventsWith('specification', 'categories');
 *   const result = await chain(items, instruction, { onProgress });
 *   const { specification, categories } = await onProgress.captured;
 *
 * Compose with an existing callback via .pipe():
 *   const onProgress = collectEventsWith('specification').pipe(existingCallback);
 *
 * @param {...string} fields - Event property names to collect
 * @returns {Function} onProgress callback with .captured promise and .pipe() method
 */
export default function collectEventsWith(...fields) {
  let resolve;
  const captured = new Promise((r) => {
    resolve = r;
  });
  const derived = {};

  const onProgress = (event) => {
    for (const field of fields) {
      if (event[field] !== undefined) derived[field] = event[field];
    }
    if (event.event === ChainEvent.complete) resolve(derived);
  };

  onProgress.captured = captured;

  onProgress.pipe = (outer) => {
    const composed = (event) => {
      onProgress(event);
      outer?.(event);
    };
    composed.captured = captured;
    return composed;
  };

  return onProgress;
}
