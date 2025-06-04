import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';

const buildPrompt = (list, instructions, categories) => {
  const instructionsBlock = wrapVariable(instructions, { tag: 'instructions' });
  const listBlock = wrapVariable(list.join('\n'), { tag: 'list' });
  const categoryBlock =
    categories && categories.length
      ? `${wrapVariable(categories.join('\n'), { tag: 'categories' })}\n`
      : '';
  const categoryText = categories && categories.length ? 'one of the <categories>' : 'a group';
  return `Assign each line in <list> to ${categoryText} according to <instructions>. Return the same number of lines containing only the group name.\n\n${instructionsBlock}\n${categoryBlock}${listBlock}`;
};

export default async function listPartition(list, instructions, categories) {
  const output = await chatGPT(buildPrompt(list, instructions, categories));
  const labels = output.split('\n');
  if (labels.length !== list.length) {
    throw new Error(
      `Batch output line count mismatch (expected ${list.length}, got ${labels.length})`
    );
  }
  const result = {};
  labels.forEach((label, idx) => {
    const key = label.trim();
    if (!result[key]) result[key] = [];
    result[key].push(list[idx]);
  });
  return result;
}
