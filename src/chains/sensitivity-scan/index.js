import probeScan from '../probe-scan/index.js';
import embedProbes from '../../lib/embed-probes/index.js';
import sensitivityProbes from '../../prompts/sensitivity-probes.js';

/**
 * Scan text for sensitive content using embedding-based semantic matching.
 *
 * Convenience wrapper that pre-wires probeScan with the built-in sensitivity probes.
 * For custom probe sets, use probeScan + embedProbes directly.
 *
 * @param {string} text - Text to scan
 * @param {object} [options]
 * @param {number} [options.threshold=0.4] - Min cosine similarity to flag
 * @param {string[]} [options.categories] - Only scan for these category strings
 * @param {number} [options.maxTokens=256] - Chunk size for long texts
 * @returns {Promise<{ flagged: boolean, hits: Array<{ category: string, label: string, score: number, chunk: { text: string, start: number, end: number } }> }>}
 */
export default async function sensitivityScan(text, options = {}) {
  const probes = await embedProbes(sensitivityProbes);
  return probeScan(text, probes, options);
}

/**
 * Create a pre-configured sensitivity scanner function.
 *
 * @param {object} [options] - Default scan options (threshold, categories, maxTokens)
 * @returns {Function} scanFn(text) → Promise<object> with `.options` property
 */
export function createSensitivityScanner(options = {}) {
  const scanFn = (text) => sensitivityScan(text, options);
  Object.defineProperty(scanFn, 'options', {
    get() {
      return options;
    },
    enumerable: true,
  });
  return scanFn;
}
