import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';

const buildPrompt = (list, instructions) => {
  const instructionsBlock = wrapVariable(instructions, { tag: 'instructions' });
  const listBlock = wrapVariable(list.join('\n'), { tag: 'list' });
  return `From the <list>, select the single item that best satisfies the <instructions>. If none apply, return an empty string.\n\n${instructionsBlock}\n${listBlock}`;
};

export default async function listFind(list, instructions, config = {}) {
  const { llm, ...options } = config;
  const output = await chatGPT(buildPrompt(list, instructions), {
    modelOptions: { ...llm },
    ...options,
  });
  return output.trim();
}
