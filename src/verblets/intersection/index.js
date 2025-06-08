import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { contentIsQuestion, tryCompleteData, onlyJSONStringArray } = promptConstants;

export const buildPrompt = (items, { instructions } = {}) => {
  const itemsList = items.join(' | ');
  const itemsBlock = wrapVariable(itemsList, { tag: 'items' });
  const intro =
    instructions ||
    'List the common features, instances, or relational links that all items share.';

  return `${contentIsQuestion} ${intro}

${itemsBlock}

The array should specify items without context, groupings, or any other data--just names.

${tryCompleteData} ${onlyJSONStringArray}`;
};

export default async function intersection(items, options = {}) {
  if (!Array.isArray(items) || items.length < 2) return [];
  const output = await chatGPT(buildPrompt(items, options));

  try {
    const parsed = JSON.parse(output.trim());
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    // Fallback to empty array if parsing fails
    return [];
  }
}
