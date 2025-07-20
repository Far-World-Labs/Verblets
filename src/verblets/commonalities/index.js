import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { contentIsQuestion, tryCompleteData, onlyJSONStringArray } = promptConstants;

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load the JSON schema for commonalities results
 * @returns {Promise<Object>} JSON schema for validation
 */
async function getCommonalitiesSchema() {
  const schemaPath = path.join(__dirname, 'commonalities-result.json');
  return JSON.parse(await fs.readFile(schemaPath, 'utf8'));
}

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Promise<Object>} Model options for chatGPT
 */
async function createModelOptions(llm = 'fastGoodCheap') {
  const schema = await getCommonalitiesSchema();

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
  const modelOptions = await createModelOptions(llm);

  const output = await chatGPT(buildPrompt(items, options), {
    modelOptions,
  });

  // Extract the items array from the object structure
  const resultArray = output?.items || output;
  return Array.isArray(resultArray) ? resultArray.filter(Boolean) : [];
}
