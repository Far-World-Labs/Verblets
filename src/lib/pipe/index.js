/**
 * Pipe a value through a sequence of async or sync transforms.
 *
 * Each step receives the output of the previous step. Steps can be:
 * - Regular functions (sync or async)
 * - Arrays of [fn, ...extraArgs] to pass additional arguments
 *
 * @example
 * // Simple pipeline
 * const result = await pipe(
 *   items,
 *   map.with('summarize each item'),
 *   compact,
 *   filter.with('is relevant to AI'),
 *   sort.with('by importance'),
 * );
 *
 * @example
 * // With extra arguments (tuple form)
 * const result = await pipe(
 *   items,
 *   [map, 'translate to French', { llm: 'default' }],
 *   compact,
 *   [score, 'translation quality'],
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
