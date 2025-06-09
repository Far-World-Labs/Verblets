import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';

const buildPrompt = function (list, instructions) {
  const instructionsBlock = wrapVariable(instructions, { tag: 'instructions' });
  const listBlock = wrapVariable(list.join('\n'), { tag: 'list' });
  return `For each line in <list>, apply the <instructions> to transform it.\nReturn the same number of lines without numbering.\n\n${instructionsBlock}\n${listBlock}`;
};

export default async function listMap(list, instructions) {
  const output = await chatGPT(buildPrompt(list, instructions));
  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length !== list.length) {
    throw new Error(
      `Batch output line count mismatch (expected ${list.length}, got ${lines.length})`
    );
  }
  return lines;
}
