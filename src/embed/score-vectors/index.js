import { cosineSimilarity } from '../../lib/pure/index.js';

/**
 * Score items by cosine similarity to a query vector.
 *
 * Pure, synchronous. Returns [{item, score}] in input order (unsorted).
 * Caller embeds beforehand and composes with .filter(), .toSorted(), etc.
 *
 * @param {Float32Array} queryVector
 * @param {Array<any>} items
 * @param {{ accessor?: (item: any) => Float32Array }} [options]
 * @returns {Array<{item: any, score: number}>}
 */
export default function scoreVectors(queryVector, items, { accessor } = {}) {
  const getVector = accessor ?? ((item) => item);
  return items.map((item) => ({
    item,
    score: cosineSimilarity(queryVector, getVector(item)),
  }));
}
