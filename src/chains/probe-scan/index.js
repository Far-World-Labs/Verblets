import { embedChunked } from '../../lib/embed/index.js';
import { cosineSimilarity } from '../../lib/pure/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';

const name = 'probe-scan';

// ===== Option Mappers =====

const DEFAULT_THRESHOLD = 0.4;

/**
 * Map detection option to a cosine similarity threshold.
 * Accepts 'low'|'high' or a raw number.
 * low: higher threshold (0.55) — fewer hits, fewer false positives.
 * high: lower threshold (0.3) — more hits, catches weaker signals.
 * @param {string|number|undefined} value
 * @returns {number} Cosine similarity threshold
 */
export const mapDetection = (value) => {
  if (value === undefined) return DEFAULT_THRESHOLD;
  if (typeof value === 'number') return value;
  return { low: 0.55, med: DEFAULT_THRESHOLD, high: 0.3 }[value] ?? DEFAULT_THRESHOLD;
};

/**
 * Scan text (or pre-embedded chunks) for probe matches against a set of pre-embedded probes.
 *
 * Uses local embeddings (no data leaves the machine) to compare text chunks
 * against probe vectors. Works with any probe set — privacy, topic, compliance, etc.
 *
 * @param {string | Array<{text: string, vector: Float32Array, start: number, end: number}>} textOrChunks - Text to scan, or pre-embedded chunks
 * @param {Array<{ category: string, label: string, vector: Float32Array }>} probes - Pre-embedded probes from embedProbes()
 * @param {object} [options]
 * @param {string|number} [options.detection] - Detection intensity: 'low' (fewer hits), 'high' (more hits), or raw threshold number
 * @param {string[]} [options.categories] - Only scan for these category strings
 * @param {number} [options.maxTokens=256] - Chunk size for long texts
 * @returns {Promise<{ flagged: boolean, hits: Array<{ category: string, label: string, score: number, chunk: { text: string, start: number, end: number } }> }>}
 */
export default async function probeScan(textOrChunks, probes, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { detection: threshold, maxTokens } = await getOptions(runConfig, {
    detection: withPolicy(mapDetection),
    maxTokens: 256,
  });
  const { categories } = runConfig;

  const chunks =
    typeof textOrChunks === 'string'
      ? await embedChunked(textOrChunks, { maxTokens })
      : textOrChunks;

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

  emitter.complete();

  return { flagged: hits.length > 0, hits };
}
