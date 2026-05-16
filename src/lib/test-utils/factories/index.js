/**
 * Fishery factory families for the verblets test suite.
 *
 * Each chain (or chain cluster) has its own factory module. The shared
 * `variants` helper produces the standard failure-variant set
 * (wellFormed, empty, isNull, malformedShape, rejected, undersized, oversized)
 * from a fishery base factory, so spec readers see consistent variant
 * vocabulary even when the underlying response shapes differ.
 *
 * Add new families by creating a new file in this directory and re-exporting
 * here. Don't force a common base shape — align variant *names*, not
 * payload structures.
 */

export {
  popReferenceFactory,
  popReferenceMatchFactory,
  popReferenceResponseFactory,
  popReferenceVariants,
  popReferenceWithCount,
} from './pop-reference.js';

export { makeResponseVariants, rejectedWith } from './variants.js';
