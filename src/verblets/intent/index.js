import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chatGPT from '../../lib/chatgpt/index.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { contentIsQuestion } = promptConstants;

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load the JSON schema for intent results
 * @returns {Promise<Object>} JSON schema for validation
 */
async function getIntentSchema() {
  const schemaPath = path.resolve(__dirname, '../../json-schemas/intent.json');
  return JSON.parse(await fs.readFile(schemaPath, 'utf8'));
}

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Promise<Object>} Model options for chatGPT
 */
async function createModelOptions(llm = 'fastGoodCheap') {
  const schema = await getIntentSchema();

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'intent_result',
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

export default async function intent({ text, config = {} } = {}) {
  const { llm, ...options } = config;
  const prompt = `${contentIsQuestion} What is the intent of this text?\n\n${text}`;

  const modelOptions = await createModelOptions(llm);
  const response = await chatGPT(prompt, { modelOptions, ...options });

  // With structured outputs, response should already be parsed
  return typeof response === 'string' ? JSON.parse(response) : response;
}
