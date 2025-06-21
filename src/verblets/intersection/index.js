import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { contentIsQuestion, tryCompleteData, onlyJSONStringArray } = promptConstants;

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load the JSON schema for intersection results
 * @returns {Promise<Object>} JSON schema for validation
 */
async function getIntersectionSchema() {
  const schemaPath = path.join(__dirname, 'intersection-result.json');
  return JSON.parse(await fs.readFile(schemaPath, 'utf8'));
}

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Promise<Object>} Model options for chatGPT
 */
async function createModelOptions(llm = 'fastGoodCheap') {
  const schema = await getIntersectionSchema();

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'intersection_result',
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
  const itemsBlock = wrapVariable(itemsList, { tag: 'items' });
  const intro =
    instructions ||
    'List the common features, instances, or relational links that all items share.';

  return `${contentIsQuestion} ${intro}

${itemsBlock}

The array should specify items without context, groupings, or any other data--just names.

${tryCompleteData} ${onlyJSONStringArray}`;
};

export default async function intersection(items, config = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  // Intersection requires at least 2 items
  if (items.length < 2) {
    return [];
  }

  const { llm, ...options } = config;
  const modelOptions = await createModelOptions(llm);

  const output = await chatGPT(buildPrompt(items, options), {
    modelOptions,
  });

  // Handle JSON parsing with robust error handling
  let parsed;
  try {
    if (typeof output === 'string') {
      // Try to clean up common JSON issues
      let cleanedOutput = output.trim();

      // Remove any text before the first { or [
      const jsonStart = Math.min(
        cleanedOutput.indexOf('{') !== -1 ? cleanedOutput.indexOf('{') : Infinity,
        cleanedOutput.indexOf('[') !== -1 ? cleanedOutput.indexOf('[') : Infinity
      );

      if (jsonStart !== Infinity && jsonStart > 0) {
        cleanedOutput = cleanedOutput.substring(jsonStart);
      }

      // Remove any text after the last } or ]
      const lastBrace = cleanedOutput.lastIndexOf('}');
      const lastBracket = cleanedOutput.lastIndexOf(']');
      const jsonEnd = Math.max(lastBrace, lastBracket);

      if (jsonEnd !== -1 && jsonEnd < cleanedOutput.length - 1) {
        cleanedOutput = cleanedOutput.substring(0, jsonEnd + 1);
      }

      parsed = JSON.parse(cleanedOutput);
    } else {
      parsed = output;
    }
  } catch (error) {
    console.error('Failed to parse JSON response from LLM:', error.message);
    console.error('Raw output:', output);

    return [];
  }

  // Extract the items array from the object structure
  const resultArray = parsed?.items || parsed;
  return Array.isArray(resultArray) ? resultArray.filter(Boolean) : [];
}
