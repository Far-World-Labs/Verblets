/**
 * Boundary type-checks for chain entry and LLM-response validation.
 *
 * Each helper returns the validated value (so it composes inline) and
 * throws a consistently-formatted diagnostic error on shape mismatch:
 *
 *   `${chain}: expected ${expected} (got ${type})`
 *
 * Why these and not a schema DSL: the errors at chain boundaries need
 * to communicate intent ("expected array of decisions from gate LLM"),
 * not just shape ("expected array"). A DSL would either lose that
 * specificity or require describing the schema twice. These primitives
 * let the caller write the diagnostic phrase directly while sharing
 * the type-check + format-error work that everyone gets slightly
 * wrong (Array.isArray vs typeof object, null exclusion, NaN, etc.).
 *
 * Use inline at the boundary:
 *
 *   const items = expectArray(response.items, {
 *     chain: 'tag-vocabulary',
 *     expected: 'tags array from LLM',
 *   });
 *
 * Cases left inline (intentionally not abstracted):
 *   - empty-string-allowed strings (rare; caller writes one if-check)
 *   - integer-only numbers (caller uses Number.isInteger)
 *   - multi-field object validation (each chain's required fields differ)
 *   - bare-vs-wrapped LLM result patterns (caller knows the dual shape)
 */

const describeType = (value) => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

const fail = (chain, expected, value) => {
  throw new Error(`${chain}: expected ${expected} (got ${describeType(value)})`);
};

/**
 * Throw unless `value` is an Array. Returns the array on success.
 * @param {*} value
 * @param {{chain: string, expected?: string}} options
 */
export const expectArray = (value, { chain, expected = 'array' }) => {
  if (!Array.isArray(value)) fail(chain, expected, value);
  return value;
};

/**
 * Throw unless `value` is a non-null, non-array object. Returns it on success.
 * @param {*} value
 * @param {{chain: string, expected?: string}} options
 */
export const expectObject = (value, { chain, expected = 'object' }) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(chain, expected, value);
  }
  return value;
};

/**
 * Throw unless `value` is a non-empty string. Returns it on success.
 * @param {*} value
 * @param {{chain: string, expected?: string}} options
 */
export const expectString = (value, { chain, expected = 'non-empty string' }) => {
  if (typeof value !== 'string' || value.length === 0) fail(chain, expected, value);
  return value;
};

/**
 * Throw unless `value` is a finite number (rejects NaN, Infinity, -Infinity).
 * Returns it on success.
 * @param {*} value
 * @param {{chain: string, expected?: string}} options
 */
export const expectNumber = (value, { chain, expected = 'finite number' }) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(chain, expected, value);
  return value;
};
