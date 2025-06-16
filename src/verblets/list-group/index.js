import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load the JSON schema for list group results
 * @returns {Promise<Object>} JSON schema for validation
 */
async function getListGroupSchema() {
  const schemaPath = path.join(__dirname, 'list-group-result.json');
  return JSON.parse(await fs.readFile(schemaPath, 'utf8'));
}

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Promise<Object>} Model options for chatGPT
 */
async function createModelOptions(llm = 'fastGoodCheap') {
  const schema = await getListGroupSchema();

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'list_group_result',
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

const buildPrompt = (list, instructions, categories) => {
  const instructionsBlock = wrapVariable(instructions, { tag: 'instructions' });
  const listBlock = wrapVariable(list.join('\n'), { tag: 'list' });
  const categoryBlock =
    categories && categories.length
      ? `${wrapVariable(categories.join('\n'), { tag: 'categories' })}\n`
      : '';
  const categoryText = categories && categories.length ? 'one of the <categories>' : 'a group';

  return `Assign each line in <list> to ${categoryText} according to <instructions>.

Return a JSON object with a "labels" array containing exactly ${list.length} group names, one for each item in the same order as the input list.

${instructionsBlock}
${categoryBlock}${listBlock}

Output format: {"labels": [array with exactly ${list.length} group names]}`;
};

export default async function listGroup(list, instructions, categories, config = {}) {
  const { llm, ...options } = config;
  const modelOptions = await createModelOptions(llm);
  const output = await chatGPT(buildPrompt(list, instructions, categories), {
    modelOptions,
    ...options,
  });

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
      parsed = { labels: lines };
    }
  } else {
    parsed = output;
  }

  // Extract labels from the object structure
  const labels = parsed?.labels || parsed;

  if (!Array.isArray(labels) || labels.length !== list.length) {
    console.warn(`Expected ${list.length} labels, got ${labels?.length || 0}`);
    // Fallback to default labels if parsing fails
    return { other: [...list] };
  }

  // Group items by their labels
  const result = {};
  labels.forEach((label, idx) => {
    const key = String(label).trim() || 'other';
    if (!result[key]) result[key] = [];
    result[key].push(list[idx]);
  });

  return result;
}
