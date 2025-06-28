import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';

function buildPrompt(list, instructions) {
  const instructionsBlock = asXML(instructions, { tag: 'instructions' });
  const listBlock = asXML(list.join('\n'), { tag: 'list' });
  return `From the <list>, select only the items that satisfy the <instructions>. Return one item per line without numbering. If none match, return an empty string.\n\n${instructionsBlock}\n${listBlock}`;
}

export default async function listFilter(list, instructions, config = {}) {
  const { llm, ...options } = config;
  const output = await chatGPT(buildPrompt(list, instructions), {
    modelOptions: { ...llm },
    ...options,
  });
  const trimmed = output.trim();
  return trimmed ? trimmed.split('\n') : [];
}
