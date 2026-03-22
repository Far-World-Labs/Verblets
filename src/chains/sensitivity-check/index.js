import sensitivityScan from '../sensitivity-scan/index.js';
import sensitivityClassify from '../../lib/sensitivity-classify/index.js';

/**
 * One-call sensitivity risk assessment — scan + classify in a single step.
 *
 * Composes sensitivityScan (embedding-based detection) with sensitivityClassify
 * (pure risk classification) for convenience.
 *
 * @param {string} text - Text to check
 * @param {object} [options]
 * @param {number} [options.threshold] - Min cosine similarity to flag
 * @param {string[]} [options.categories] - Only scan for these categories
 * @param {number} [options.maxTokens] - Chunk size for long texts
 * @returns {Promise<{ flagged: boolean, level: string, maxScore: number, categories: object, summary: string, scan: object }>}
 */
export default async function sensitivityCheck(text, options = {}) {
  const scan = await sensitivityScan(text, options);
  const classification = sensitivityClassify(scan);
  return { flagged: scan.flagged, ...classification, scan };
}

/**
 * Create a pre-configured sensitivity checker function.
 *
 * @param {object} [options] - Default check options (threshold, categories, maxTokens)
 * @returns {Function} checkFn(text) → Promise<object> with `.options` property
 */
export function createSensitivityChecker(options = {}) {
  const checkFn = (text) => sensitivityCheck(text, options);
  Object.defineProperty(checkFn, 'options', {
    get() {
      return options;
    },
    enumerable: true,
  });
  return checkFn;
}
