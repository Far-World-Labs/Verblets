import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';

function buildPrompt(acc, list, instructions) {
  const instructionsBlock = wrapVariable(instructions, { tag: 'instructions' });
  const accBlock = wrapVariable(acc, { tag: 'accumulator' });
  const listBlock = wrapVariable(list.join('\n'), { tag: 'list' });
  return `Start with the <accumulator>. Apply the <instructions> to each item in <list> sequentially, using the result as the new accumulator each time. Return only the final accumulator.\n\n${instructionsBlock}\n${accBlock}\n${listBlock}`;
}

export default async function listReduce(acc, list, instructions) {
  const output = await chatGPT(buildPrompt(acc, list, instructions));
  return output.trim();
}
