import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';

function buildPrompt(acc, list, instructions) {
  const instructionsBlock = wrapVariable(instructions, {
    tag: 'instructions',
    forceHTML: true,
  });
  const accBlock = wrapVariable(acc, { tag: 'accumulator', forceHTML: true });
  const listBlock = wrapVariable(list.join('\n'), { tag: 'list' });
  return `Start with the given accumulator. Apply the <instructions> to each item in <list> sequentially, using the result as the new accumulator each time. Return only the final accumulator.\n\n${instructionsBlock}\n${accBlock}\n${listBlock}`;
}

export default async function listReduce(acc, list, instructions, config = {}) {
  const { llm, ...options } = config;
  const output = await chatGPT(buildPrompt(acc, list, instructions), {
    modelOptions: { ...llm },
    ...options,
  });
  return output.trim();
}
