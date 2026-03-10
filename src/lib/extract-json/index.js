/**
 * Extract JSON from freeform text using bracket-matching with string-escape awareness.
 *
 * Tries direct JSON.parse first. On failure, finds the first `{` or `[`,
 * tracks depth while respecting string escapes, and parses the matched span.
 *
 * @param {string} text - Text that may contain embedded JSON
 * @returns {*} Parsed JSON value
 * @throws {Error} If no JSON object/array is found or JSON is unterminated
 */
export default function extractJson(text) {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting just the JSON portion (handle trailing text after JSON)
    const start = text.indexOf('{') === -1 ? text.indexOf('[') : text.indexOf('{');
    if (start === -1) throw new Error('No JSON object or array found in response');

    const opener = text[start];
    const closer = opener === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\' && inString) {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === opener) depth++;
      if (ch === closer) depth--;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
    throw new Error('Unterminated JSON in response');
  }
}
