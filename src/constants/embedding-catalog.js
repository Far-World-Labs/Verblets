/**
 * Embedding Model Catalog
 *
 * Built-in model definitions for the EmbeddingService.
 * Each entry describes how to load and run a specific embedding model.
 *
 * Loader types:
 *   'pipeline' — @huggingface/transformers feature-extraction pipeline (text only)
 *   'clip'     — CLIP text + vision models via AutoTokenizer/AutoProcessor (multimodal)
 */

import { get as configGet } from '../lib/config/index.js';

/**
 * Build the embedding catalog, incorporating the VERBLETS_EMBED_MODEL env var
 * as the pipeline (text-only / good) model.
 */
export function buildEmbedCatalog() {
  const pipelineModel = configGet('VERBLETS_EMBED_MODEL');

  return {
    [pipelineModel]: {
      name: pipelineModel,
      dimensions: 384,
      loader: 'pipeline',
      dtype: 'fp32',
      pooling: 'cls',
      normalize: true,
    },
    'Xenova/clip-vit-base-patch32': {
      name: 'Xenova/clip-vit-base-patch32',
      dimensions: 512,
      loader: 'clip',
      dtype: 'fp32',
    },
    'Xenova/clip-vit-base-patch16': {
      name: 'Xenova/clip-vit-base-patch16',
      dimensions: 512,
      loader: 'clip',
      dtype: 'fp32',
    },
    'Xenova/clip-vit-large-patch14': {
      name: 'Xenova/clip-vit-large-patch14',
      dimensions: 768,
      loader: 'clip',
      dtype: 'fp32',
    },
  };
}
