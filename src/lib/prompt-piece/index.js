// ── Prompt Piece ────────────────────────────────────────────────────
// Unified entry point for the prompt piece system:
// - markers: text surgery (extract/insert marked sections)
// - piece: piece construction, rendering, tag matching, inspection
// - routing: connection derivation, dependency ordering, cycle detection
// - advisors: AI-powered advisory operations (reshape, tag, reconcile)

export { extractSections, insertSections } from './markers.js';

export {
  createPiece,
  addInput,
  removeInput,
  render,
  matchSources,
  pendingInputs,
  isReady,
  ambiguousInputs,
} from './piece.js';

export {
  connectParts,
  connectDownstream,
  connectUpstream,
  runOrder,
  detectCycles,
} from './routing.js';

export { reshape, proposeTags, tagSource, tagReconcile, tagConsolidate } from './advisors.js';

export { default } from './advisors.js';
