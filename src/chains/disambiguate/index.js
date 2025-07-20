import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chatGPT from '../../lib/chatgpt/index.js';
import score from '../score/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import modelService from '../../services/llm-model/index.js';

const { onlyJSONStringArray } = promptConstants;

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load the JSON schema for disambiguate meanings results
 * @returns {Promise<Object>} JSON schema for validation
 */
async function getDisambiguateMeaningsSchema() {
  const schemaPath = path.join(__dirname, 'disambiguate-meanings-result.json');
  return JSON.parse(await fs.readFile(schemaPath, 'utf8'));
}

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Promise<Object>} Model options for chatGPT
 */
async function createModelOptions(llm = 'fastGoodCheap') {
  const schema = await getDisambiguateMeaningsSchema();

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'disambiguate_meanings_result',
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

const meaningsPrompt = (term) => {
  return `${onlyJSONStringArray}
List all distinct dictionary meanings or common uses of "${term}".
Return a JSON object with a "meanings" array containing the distinct meanings.
${onlyJSONStringArray}`;
};

export const getMeanings = async (term, config = {}) => {
  const { model = modelService.getBestPublicModel(), llm, ...options } = config;
  const prompt = meaningsPrompt(term);
  const budget = model.budgetTokens(prompt);
  const modelOptions = await createModelOptions(llm);
  const response = await chatGPT(prompt, {
    maxTokens: budget.completion,
    modelOptions,
    ...options,
  });

  const resultArray = response?.meanings || response;
  return Array.isArray(resultArray) ? resultArray.filter(Boolean) : [];
};

export default async function disambiguate({
  term,
  context,
  model = modelService.getBestPublicModel(),
  ...config
} = {}) {
  const { llm, ...options } = config;
  const meanings = await getMeanings(term, { model, llm, ...options });
  const scores = await score(
    meanings,
    `how well this meaning of "${term}" matches the context: ${context}`,
    { llm, ...options }
  );

  let bestIndex = 0;
  let bestScore = scores[0];

  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > bestScore) {
      bestScore = scores[i];
      bestIndex = i;
    }
  }

  return { meaning: meanings[bestIndex], meanings };
}
