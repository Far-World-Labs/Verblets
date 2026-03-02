/**
 * Normalize text for consistent processing.
 *
 * NFC normalize → unify line endings → collapse whitespace → apply
 * strip patterns → trim.  Preserves paragraph structure (newlines kept).
 *
 * @param {string} text
 * @param {object} [options]
 * @param {RegExp[]} [options.stripPatterns] - Patterns to remove
 * @returns {string}
 */
export default function embedNormalizeText(text, options = {}) {
  const { stripPatterns = [] } = options;

  let result = text.normalize('NFC');
  result = result.replace(/\r\n|\r/g, '\n');
  result = result.replace(/[^\S\n]+/g, ' ');

  for (const pattern of stripPatterns) {
    result = result.replace(pattern, '');
  }

  result = result.replace(/[^\S\n]+/g, ' ');

  return result.trim();
}
