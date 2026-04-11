import { embedBatch } from '../../lib/embed/local/index.js';
import { cosineSimilarity } from '../../lib/pure/index.js';

/**
 * Score items by semantic similarity to a query.
 *
 * Returns [{item, score}] aligned with input order (unsorted).
 * Compose with standard JS: .filter(s => s.score > t), .toSorted(sortBy(s => -s.score)), etc.
 *
 * @param {Array<string|any>} items
 * @param {string} query
 * @param {{ accessor?: (item) => string, abortSignal?: AbortSignal }} [config]
 * @returns {Promise<Array<{item: any, score: number}>>}
 */
export default async function embedScore(items, query, config = {}) {
  if (items.length === 0) return [];
  const { accessor = String, abortSignal } = config;
  const texts = items.map(accessor);
  const vectors = await embedBatch([query, ...texts], { abortSignal });
  const queryVector = vectors[0];
  return items.map((item, i) => ({
    item,
    score: cosineSimilarity(queryVector, vectors[i + 1]),
  }));
}
