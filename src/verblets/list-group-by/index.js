import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';
import toObject from '../to-object/index.js';

function buildPrompt(list, instructions) {
  const instructionsBlock = wrapVariable(instructions, { tag: 'instructions' });
  const listBlock = wrapVariable(list.join('\n'), { tag: 'list' });
  return `Group each item in <list> according to the <instructions>. Return a JSON object where keys are group names and values are arrays of the original items.\n\n${instructionsBlock}\n${listBlock}`;
}

export default async function listGroupBy(list, instructions) {
  const output = await chatGPT(buildPrompt(list, instructions));
  return toObject(output);
}
