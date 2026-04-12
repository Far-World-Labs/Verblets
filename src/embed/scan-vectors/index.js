import { cosineSimilarity } from '../../lib/pure/index.js';

/**
 * Score all chunk×probe pairs by cosine similarity.
 *
 * Pure, synchronous. Returns [{category, label, score, chunk}] sorted
 * by score descending. No threshold — caller filters as needed.
 *
 * @param {Array<{text: string, vector: Float32Array, start: number, end: number}>} chunks
 * @param {Array<{category: string, label: string, vector: Float32Array}>} probes
 * @param {{ categories?: string[] }} [options]
 * @returns {Array<{category: string, label: string, score: number, chunk: {text: string, start: number, end: number}}>}
 */
export default function scanVectors(chunks, probes, { categories } = {}) {
  const activeProbes = categories ? probes.filter((p) => categories.includes(p.category)) : probes;

  const hits = [];
  for (const chunk of chunks) {
    for (const probe of activeProbes) {
      hits.push({
        category: probe.category,
        label: probe.label,
        score: cosineSimilarity(chunk.vector, probe.vector),
        chunk: { text: chunk.text, start: chunk.start, end: chunk.end },
      });
    }
  }

  return hits.toSorted((a, b) => b.score - a.score);
}
