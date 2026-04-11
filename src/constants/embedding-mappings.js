/**
 * Embedding Mappings
 *
 * Ordered pattern-matching rules that map capability requests to embedding models.
 * Same structure as LLM model-mappings: { match?, use } with first-match-wins.
 *
 * Default behavior: multi (CLIP) is the catch-all. Request { good: true } to
 * get the text-only pipeline model (higher quality text embeddings, no images).
 */

import { get as configGet } from '../lib/config/index.js';

/**
 * Build default embedding rules.
 *
 * The pipeline (text-only) model is selected only when good is requested
 * without multi. Everything else falls through to CLIP.
 */
export function buildDefaultEmbedRules() {
  const pipelineModel = configGet('VERBLETS_EMBED_MODEL');

  return [
    { match: { good: true, multi: false }, use: pipelineModel },
    { use: 'Xenova/clip-vit-base-patch16' },
  ];
}
