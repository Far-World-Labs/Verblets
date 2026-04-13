/**
 * Pipe a value through a sequence of async or sync transforms.
 *
 * Each step receives the output of the previous step. Steps can be:
 * - Regular functions (sync or async)
 * - Arrays of [fn, ...extraArgs] to pass additional arguments
 *
 * @example
 * const result = await pipe(
 *   items,
 *   [map, 'translate to French'],
 *   compact,
 *   [filter, 'is relevant to AI'],
 *   [sort, 'by importance'],
 * );
 *
 * @param {*} initial - Starting value
 * @param {...(Function|Array)} steps - Transform functions or [fn, ...args] tuples
 * @returns {Promise<*>} Final transformed value
 */
export default async function pipe(initial, ...steps) {
  let value = initial;
  for (const step of steps) {
    if (Array.isArray(step)) {
      const [fn, ...args] = step;
      value = await fn(value, ...args);
    } else {
      value = await step(value);
    }
  }
  return value;
}
