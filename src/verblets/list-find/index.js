import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';

function buildPrompt(list, instructions) {
  const instructionsBlock = wrapVariable(instructions, { tag: 'instructions' });
  const listBlock = wrapVariable(list.join('\n'), { tag: 'list' });
  return `Find the first line in <list> that satisfies the <instructions>. Return only that line or nothing if none match.\n\n${instructionsBlock}\n${listBlock}`;
}

export default async function listFind(list, instructions) {
  const output = await chatGPT(buildPrompt(list, instructions));
  const line = output.trim();
  return list.includes(line) ? line : undefined;
}
