// Embedding primitives
export {
  embed,
  embedBatch,
  embedChunked,
  embedWarmup,
  embedImage,
  embedImageBatch,
  setEmbedEnabled,
} from './local.js';

export { isEmbedEnabled } from './state.js';

// Object construction (LLM chains)
export { default as define } from '../chains/embed-object-define/index.js';
export { default as fragment } from '../chains/embed-object-fragment/index.js';
export { default as refine } from '../chains/embed-object-refine/index.js';

// Object construction (vector/embed)
export { default as embedObject } from './embed-object/index.js';
export { default as shapeState } from './shape-state/index.js';
export { default as planRead } from './plan-read/index.js';
export { read, readDetails } from './read/index.js';
export { default as match } from './match/index.js';

// Scoring
export { default as scoreChunksByProbes } from './score-chunks-by-probes/index.js';
