import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import listExpandSchema from './list-expand-result.json';

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Object} Model options for chatGPT
 */
function createModelOptions(llm = 'fastGoodCheap') {
  const schema = listExpandSchema;

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'list_expand_result',
      schema,
    },
  };

  if (typeof llm === 'string') {
    return {
      modelName: llm,
      response_format: responseFormat,
    };
  } else {
    return {
      ...llm,
      response_format: responseFormat,
    };
  }
}

// TODO: This could potentially be refactored to use the list chain (../../chains/list/index.js)
// for better consistency, but would require adapting the list chain to support this simpler
// expansion use case without changing the current behavior and test expectations.

const buildPrompt = function (list, count) {
  const listBlock = asXML(list.join('\n'), { tag: 'list' });
  return (
    `Expand <list> with new items that belong to the same category and ` +
    `match the style of the existing entries. Avoid duplicates or extraneous ` +
    `text. Continue adding entries until there are at least ${count} in total. ` +
    `Return a JSON object with an "items" array containing all the expanded items.\n\n${listBlock}`
  );
};

/**
 * Expand a list with new items that belong to the same category and match the style.
 * This is a simplified interface to the list chain for expansion use cases.
 *
 * @param {string[]} existingList - The list to expand
 * @param {number} targetCount - Target total count (default: double the input)
 * @param {Object} config - Configuration options including llm settings
 * @returns {Promise<string[]>} Expanded list
 */
export default async function listExpand(list, count = list.length * 2, config = {}) {
  const { llm, ...options } = config;
  const modelOptions = createModelOptions(llm);
  const output = await chatGPT(buildPrompt(list, count), { modelOptions, ...options });

  // Extract items from the object structure
  const items = output?.items || output;

  if (!Array.isArray(items)) {
    console.warn('Expected items array, got:', typeof items);
    return [];
  }

  return items;
}
