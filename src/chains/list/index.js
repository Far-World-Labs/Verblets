import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { operationTimeoutMultiplier } from '../../constants/models.js';
import chatGPT from '../../lib/chatgpt/index.js';
import {
  asObjectWithSchema as asObjectWithSchemaPrompt,
  generateList as generateListPrompt,
  constants as promptConstants,
} from '../../prompts/index.js';
import modelService from '../../services/llm-model/index.js';

const { onlyJSON, contentIsTransformationSource, onlyJSONArray } = promptConstants;

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load the JSON schema for list results
 * @returns {Promise<Object>} JSON schema for validation
 */
async function getListSchema() {
  const schemaPath = path.join(__dirname, 'list-result.json');
  return JSON.parse(await fs.readFile(schemaPath, 'utf8'));
}

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Promise<Object>} Model options for chatGPT
 */
async function createModelOptions(llm = 'fastGoodCheap') {
  const schema = await getListSchema();

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'list_result',
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

const outputTransformPrompt = (result, schema) => {
  return `${contentIsTransformationSource} ${result}

${asObjectWithSchemaPrompt(schema)}

${onlyJSON}`;
};

const shouldSkipDefault = ({ result, resultsAll } = {}) => {
  return resultsAll.includes(result);
};

const shouldStopDefault = ({ queryCount, startTime } = {}) => {
  return (
    queryCount > 5 ||
    new Date() - startTime >
      operationTimeoutMultiplier * modelService.getBestPublicModel().requestTimeout
  );
};

export const generateList = async function* generateListGenerator(text, options = {}) {
  const resultsAll = [];
  const resultsAllMap = {};
  let isDone = false;
  const {
    shouldSkip = shouldSkipDefault,
    shouldStop = shouldStopDefault,
    model = 'fastGoodCheap',
    // eslint-disable-next-line no-unused-vars
    _schema,
    ...passThroughOptions
  } = options;

  const startTime = new Date();
  let queryCount = 0;

  while (!isDone) {
    const listPrompt = generateListPrompt(text, {
      ...options,
      existing: resultsAll,
    });

    let resultsNew = [];
    try {
      const modelOptions = await createModelOptions(model);
      // eslint-disable-next-line no-await-in-loop
      const results = await chatGPT(listPrompt, {
        modelOptions,
        ...passThroughOptions,
      });

      // With structured outputs, response should already be parsed and validated
      const parsed = typeof results === 'string' ? JSON.parse(results) : results;
      // Extract items from the object structure
      const resultArray = parsed?.items || parsed;
      resultsNew = Array.isArray(resultArray) ? resultArray.filter(Boolean) : [];
    } catch (error) {
      if (/The operation was aborted/.test(error.message)) {
        // eslint-disable-next-line no-console
        console.error('Generate list [error]: Aborted');
        resultsNew = []; // continue
      } else {
        // eslint-disable-next-line no-console
        console.error(
          `Generate list [error]: ${error.message}`,
          listPrompt.slice(0, 100).replace('\n', '\\n')
        );
        isDone = true;
        break;
      }
    }

    const resultsNewUnique = resultsNew.filter((item) => !(item in resultsAllMap));

    queryCount += 1;

    for (const result of resultsNewUnique) {
      const perResultControlFactors = {
        result,
        resultsAll,
        resultsNew,
        queryCount,
        startTime,
      };

      // eslint-disable-next-line no-await-in-loop
      if (await shouldStop(perResultControlFactors)) {
        isDone = true;
        break;
      }

      // eslint-disable-next-line no-await-in-loop
      if (!(await shouldSkip(perResultControlFactors))) {
        resultsAllMap[result] = true;
        resultsAll.push(result);

        // debug helper:
        // console.error(R.sort((a, b) => a.localeCompare(b), resultsAll));

        yield result;
      }
    }

    const perQueryControlFactors = {
      result: undefined,
      resultsAll: [],
      resultsNew: [],
      queryCount,
      startTime,
    };

    // eslint-disable-next-line no-await-in-loop
    if (await shouldStop(perQueryControlFactors)) {
      isDone = true;
    }
  }
};

export default async function list(prompt, config = {}) {
  const { llm, schema, ...options } = config;
  const fullPrompt = `${prompt}\n\n${onlyJSONArray}`;

  const modelOptions = await createModelOptions(llm);
  const response = await chatGPT(fullPrompt, {
    modelOptions,
    ...options,
  });

  // With structured outputs, response should already be parsed and validated
  const result = typeof response === 'string' ? JSON.parse(response) : response;
  // Extract items from the object structure
  const resultArray = result?.items || result;
  const items = Array.isArray(resultArray) ? resultArray : [];

  // If schema is provided, transform each item to match the schema
  if (schema && items.length > 0) {
    const transformedItems = [];
    for (const item of items) {
      const transformPrompt = outputTransformPrompt(item, schema);
      const transformResponse = await chatGPT(transformPrompt, {
        modelOptions: {
          ...llm,
        },
        ...options,
      });
      try {
        const transformedItem = JSON.parse(transformResponse);
        transformedItems.push(transformedItem);
      } catch {
        // If transformation fails, keep the original item
        transformedItems.push(item);
      }
    }
    return transformedItems;
  }

  return items;
}
