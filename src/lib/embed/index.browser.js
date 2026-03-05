// @huggingface/transformers supports both Node and browser (WASM/WebGPU).
// Re-export the shared implementation directly.
export { embed, embedBatch, embedChunked, embedWarmup } from './index.js';
