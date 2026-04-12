// @huggingface/transformers supports both Node and browser (WASM/WebGPU).
// Re-export the shared implementation directly.
export {
  embed,
  embedBatch,
  embedChunked,
  embedWarmup,
  setEmbedEnabled,
  embedImage,
  embedImageBatch,
} from './index.js';
