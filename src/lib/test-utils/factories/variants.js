/**
 * Shared variant vocabulary for LLM mock responses.
 *
 * Each chain has its own well-formed response shape (pop-reference returns
 * `{ references: [...] }`, score returns `{ value: number|string }`, etc.) —
 * we don't force them into a common base. What we *do* align is the *naming*
 * of the failure variants, so spec readers see consistent variant labels
 * across chains.
 *
 * `makeResponseVariants` takes a fishery base factory and an `arrayKey`
 * (the property whose value is the result array, if any) and returns the
 * standard variant set. Chains with non-array responses (e.g. score's
 * `{ value }`) call the helper with `arrayKey: null` and skip the
 * size-related variants.
 */

/**
 * @param {object} opts
 * @param {import('fishery').Factory} opts.base                 — fishery factory for the well-formed shape
 * @param {string|null} [opts.arrayKey='items']                  — property holding the result array, or null
 * @param {Function} [opts.makeArrayItem]                        — factory builder for one array entry (when arrayKey is set)
 * @param {object} [opts.malformedShape={ wrong: 'shape' }]      — what to return for the malformed variant
 * @param {*} [opts.emptyValue]                                  — value used when we return "empty"; defaults to `[]` if arrayKey is set, `null` otherwise
 * @returns {object} variants — `{ wellFormed, empty, isNull, undefinedValue, malformedShape, rejected, undersized, oversized }`
 */
export function makeResponseVariants({
  base,
  arrayKey = 'items',
  makeArrayItem,
  malformedShape = { wrong: 'shape' },
  emptyValue,
} = {}) {
  if (!base || typeof base.build !== 'function') {
    throw new Error('makeResponseVariants: base must be a fishery Factory');
  }

  const computedEmpty = emptyValue ?? (arrayKey ? { [arrayKey]: [] } : null);

  const variants = {
    wellFormed: () => base.build(),
    empty: () => computedEmpty,
    isNull: () => null,
    undefinedValue: () => undefined,
    malformedShape: () => malformedShape,
    rejected: (error = new Error('LLM call failed')) => {
      throw error;
    },
  };

  if (arrayKey && typeof makeArrayItem === 'function') {
    variants.undersized = () => base.build({ [arrayKey]: [] });
    variants.oversized = () =>
      base.build({ [arrayKey]: Array.from({ length: 12 }, () => makeArrayItem()) });
  }

  return variants;
}

/**
 * Pure helper for "the LLM rejected the call" — returns a thunk that throws
 * when invoked. Mirrors fishery's lazy-build style.
 */
export const rejectedWith = (error) => () => {
  throw error instanceof Error ? error : new Error(String(error));
};
