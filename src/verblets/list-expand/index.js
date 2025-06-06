import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';

function buildPrompt(list, count) {
  const listBlock = wrapVariable(list.join('\n'), { tag: 'list' });
  return (
    `Expand <list> with new items that belong to the same category and ` +
    `match the style of the existing entries. Avoid duplicates or extraneous ` +
    `text. Continue adding entries until there are at least ${count} in total. ` +
    `Return one item per line without numbering.\n\n${listBlock}`
  );
}

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
