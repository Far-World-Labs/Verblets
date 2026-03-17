import { embedChunked } from '../../lib/embed/index.js';
import { cosineSimilarity } from '../../lib/pure/index.js';
import { resolveOption } from '../../lib/context/resolve.js';

/**
 * Scan text for probe matches against a set of pre-embedded probes.
 *
 * Uses local embeddings (no data leaves the machine) to compare text chunks
 * against probe vectors. Works with any probe set — privacy, topic, compliance, etc.
 *
 * @param {string} text - Text to scan
 * @param {Array<{ category: string, label: string, vector: Float32Array }>} probes - Pre-embedded probes from embedProbes()
 * @param {object} [options]
 * @param {number} [options.threshold=0.4] - Min cosine similarity to flag
 * @param {string[]} [options.categories] - Only scan for these category strings
 * @param {number} [options.maxTokens=256] - Chunk size for long texts
 * @returns {Promise<{ flagged: boolean, hits: Array<{ category: string, label: string, score: number, chunk: { text: string, start: number, end: number } }> }>}
 */
export default async function probeScan(text, probes, options = {}) {
  const { categories, maxTokens = 256 } = options;
  const threshold = resolveOption('threshold', options, 0.4);

  const chunks = await embedChunked(text, { maxTokens });

  const activeProbes = categories ? probes.filter((p) => categories.includes(p.category)) : probes;

  const hits = [];
  for (const chunk of chunks) {
    for (const probe of activeProbes) {
      const score = cosineSimilarity(chunk.vector, probe.vector);
      if (score >= threshold) {
        hits.push({
          category: probe.category,
          label: probe.label,
          score,
          chunk: { text: chunk.text, start: chunk.start, end: chunk.end },
        });
      }
    }
  }

  hits.sort((a, b) => b.score - a.score);

  return { flagged: hits.length > 0, hits };
}
