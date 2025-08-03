import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import commonalitiesSchema from './commonalities-result.json';

const { contentIsQuestion, tryCompleteData, onlyJSONStringArray } = promptConstants;

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Object} Model options for chatGPT
 */
function createModelOptions(llm = 'fastGoodCheap') {
  const schema = commonalitiesSchema;

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'commonalities_result',
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

export const buildPrompt = (items, { instructions } = {}) => {
  const itemsList = items.join(' | ');
  const itemsBlock = asXML(itemsList, { tag: 'items' });
  const intro =
    instructions ||
    'Identify the common elements, shared features, or overlapping aspects that connect all the given items.';

  return `${contentIsQuestion} ${intro}

${itemsBlock}

Provide a clear, focused list of items that represent the intersection or commonality between all the given categories.

${tryCompleteData} ${onlyJSONStringArray}`;
};

export default async function commonalities(items, config = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  // Finding commonalities requires at least 2 items
  if (items.length < 2) {
    return [];
  }

  const { llm, ...options } = config;
  const modelOptions = createModelOptions(llm);

  const output = await chatGPT(buildPrompt(items, options), {
    modelOptions,
  });

  const resultArray = output?.items || output;
  return Array.isArray(resultArray) ? resultArray.filter(Boolean) : [];
}
