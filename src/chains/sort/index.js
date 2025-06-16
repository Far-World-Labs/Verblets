import * as R from 'ramda';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import chatGPT from '../../lib/chatgpt/index.js';
import { sort as sortPromptInitial } from '../../prompts/index.js';
import modelService from '../../services/llm-model/index.js';

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load the JSON schema for sort results
 * @returns {Promise<Object>} JSON schema for validation
 */
async function getSortSchema() {
  const schemaPath = path.join(__dirname, 'sort-result.json');
  return JSON.parse(await fs.readFile(schemaPath, 'utf8'));
}

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Promise<Object>} Model options for chatGPT
 */
async function createModelOptions(llm = 'fastGoodCheap') {
  const schema = await getSortSchema();

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'sort_result',
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

// redeclared so it's clearer how tests can override the sorter
let sortPrompt = sortPromptInitial;

export const defaultSortChunkSize = 10;
export const defaultSortExtremeK = 10;
export const defaultSortIterations = 1;

// Keeping this here because it's useful for internal debugging
// eslint-disable-next-line no-unused-vars
const assertSorted = (list) => {
  const pairwiseComparisons = R.aperture(2, list);
  if (!R.all(([a, b]) => b.localeCompare(a) <= 0, pairwiseComparisons)) {
    throw new Error(JSON.stringify(list, null, 2));
  }
};

export const useTestSortPrompt = () => {
  sortPrompt = (options, list) => ({ options, list });
};

const sanitizeList = (list) => {
  return [...new Set(list.filter((item) => item.trim() !== ''))];
};

const sort = async (
  options,
  listInitial,
  model = modelService.getBestPublicModel(),
  config = {}
) => {
  const {
    by,
    chunkSize = defaultSortChunkSize,
    extremeK = defaultSortExtremeK,
    iterations = defaultSortIterations,
  } = options;

  const { llm, ...passThroughOptions } = config;

  const list = sanitizeList(listInitial);
  let i = iterations;
  let top = [];
  let bottom = [];
  let middle = list;

  while (i > 0) {
    let newTop = [];
    let newBottom = [];
    let discardedTop = [];
    let discardedBottom = [];

    for (let j = 0; j < middle.length; j += chunkSize) {
      const batch = middle.slice(j, j + chunkSize);
      const prompt = sortPrompt(
        {
          description: by,
        },
        [...batch, ...newTop, ...newBottom]
      );

      const budget = model.budgetTokens(prompt);
      const modelOptions = await createModelOptions(llm);

      // eslint-disable-next-line no-await-in-loop
      const result = await chatGPT(prompt, {
        modelOptions: {
          ...modelOptions,
          maxTokens: budget.completion,
          requestTimeout: model.requestTimeout * 1.5,
        },
        ...passThroughOptions,
      });

      // With structured outputs, response should already be parsed and validated
      const batchSorted = typeof result === 'string' ? JSON.parse(result) : result;
      // Extract items from the object structure
      const resultArray = batchSorted?.items || batchSorted;
      const sortedArray = Array.isArray(resultArray) ? resultArray.filter(Boolean) : [];

      const batchTop = sortedArray.slice(0, extremeK);
      const batchBottom = sortedArray.slice(-extremeK);

      discardedTop = [...newTop.filter((x) => !batchTop.includes(x)), ...discardedTop];

      discardedBottom = [...discardedBottom, ...newBottom.filter((x) => !batchBottom.includes(x))];

      newTop = batchTop;
      newBottom = batchBottom;
    }
    top = [...top, ...newTop];
    bottom = [...newBottom, ...bottom];

    const middleOld = middle.filter((x) => {
      return (
        !newTop.includes(x) &&
        !discardedTop.includes(x) &&
        !discardedBottom.includes(x) &&
        !newBottom.includes(x)
      );
    });
    middle = [...discardedTop, ...middleOld, ...discardedBottom];
    i -= 1;
  }

  const finalList = [...top, ...middle, ...bottom];
  return finalList;
};

export default async function sortWrapper(list, criteria, config = {}) {
  const { model = modelService.getBestPublicModel(), ...options } = config;
  return await sort({ by: criteria, ...options }, list, model, config);
}
