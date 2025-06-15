import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';

// TODO: This could potentially be refactored to use the list chain (../../chains/list/index.js)
// for better consistency, but would require adapting the list chain to support this simpler
// expansion use case without changing the current behavior and test expectations.

const buildPrompt = function (list, count) {
  const listBlock = wrapVariable(list.join('\n'), { tag: 'list' });
  return (
    `Expand <list> with new items that belong to the same category and ` +
    `match the style of the existing entries. Avoid duplicates or extraneous ` +
    `text. Continue adding entries until there are at least ${count} in total. ` +
    `Return one item per line without numbering.\n\n${listBlock}`
  );
};

/**
 * Expand a list with new items that belong to the same category and match the style.
 * This is a simplified interface to the list chain for expansion use cases.
 *
 * @param {string[]} existingList - The list to expand
 * @param {number} targetCount - Target total count (default: double the input)
 * @param {Object} options - Additional options passed to the list chain
 * @returns {Promise<string[]>} Expanded list
 */
export default async function listExpand(list, count = list.length * 2) {
  const output = await chatGPT(buildPrompt(list, count));
  const lines = output
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < count) {
    throw new Error(
      `Batch output line count mismatch (expected at least ${count}, got ${lines.length})`
    );
  }
  return lines;
}
