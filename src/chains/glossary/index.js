import sort from '../sort/index.js';
import { bulkMapRetry } from '../bulk-map/index.js';

/**
 * Extract uncommon or technical terms from text so they can be defined later.
 * Large texts are processed paragraph by paragraph and the terms are
 * de-duplicated then ranked by importance.
 *
 * @param {string} text - source text
 * @param {object} [options]
 * @param {number} [options.maxTerms=10] - maximum terms to return
 * @returns {Promise<string[]>} ordered list of important terms
 */
export default async function glossary(text, { maxTerms = 10, chunkSize = 5 } = {}) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim() !== '');
  const instructions =
    'List the complex or technical terms a casual reader might not understand from <item>. ' +
    'Return them comma separated on a single line.';

  const mapped = await bulkMapRetry(paragraphs, instructions, { chunkSize });

  const termSet = new Set();
  mapped.forEach((line) => {
    if (typeof line === 'string') {
      line
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((t) => termSet.add(t));
    }
  });

  const ranked = await sort(
    { by: 'by importance and difficulty for general audiences' },
    Array.from(termSet)
  );

  return ranked.slice(0, maxTerms);
}
