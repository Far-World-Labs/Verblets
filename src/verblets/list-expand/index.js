import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load the JSON schema for list expand results
 * @returns {Promise<Object>} JSON schema for validation
 */
async function getListExpandSchema() {
  const schemaPath = path.join(__dirname, 'list-expand-result.json');
  return JSON.parse(await fs.readFile(schemaPath, 'utf8'));
}

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Promise<Object>} Model options for chatGPT
 */
async function createModelOptions(llm = 'fastGoodCheap') {
  const schema = await getListExpandSchema();

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
  const listBlock = wrapVariable(list.join('\n'), { tag: 'list' });
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
  const modelOptions = await createModelOptions(llm);
  const output = await chatGPT(buildPrompt(list, count), { modelOptions, ...options });

  // With structured outputs, response should already be parsed and validated
  let parsed;
  if (typeof output === 'string') {
    try {
      parsed = JSON.parse(output);
    } catch {
      // Handle non-JSON responses (e.g., from mocks or fallback cases)
      // Split by newlines and filter out empty lines
      const lines = output
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      parsed = { items: lines };
    }
  } else {
    parsed = output;
  }

  // Extract items from the object structure
  const items = parsed?.items || parsed;

  if (!Array.isArray(items)) {
    console.warn('Expected items array, got:', typeof items);
    return [];
  }

  return items;
}
