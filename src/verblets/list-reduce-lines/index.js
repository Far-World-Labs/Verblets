import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';

function buildPrompt(acc, list, instructions) {
  const instructionsBlock = asXML(instructions, {
    tag: 'instructions',
  });
  const accBlock = asXML(acc, { tag: 'accumulator' });
  const listBlock = asXML(list.join('\n'), { tag: 'list' });
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
