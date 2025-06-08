import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';
import { rangeCombinations } from '../../lib/combinations/index.js';

export const buildPrompt = (items, { instructions } = {}) => {
  const sets = rangeCombinations(items)
    .map((group) => group.join(' | '))
    .join('\n');
  const setsBlock = wrapVariable(sets, { tag: 'sets' });
  const intro =
    instructions ||
    'Describe any common features, instances, or relational links that all items in a group share.';
  return `${intro}\nFor each line in <sets>, provide a short intersection description. Leave the line blank if nothing fits.\n\n${setsBlock}`;
};

export default async function intersection(items, options = {}) {
  if (!Array.isArray(items) || items.length < 2) return [];
  const output = await chatGPT(buildPrompt(items, options));
  const lines = output
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return lines;
}
