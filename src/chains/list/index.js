import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { debug } from '../../lib/debug/index.js';
import {
  asObjectWithSchema as asObjectWithSchemaPrompt,
  generateList as generateListPrompt,
  constants as promptConstants,
} from '../../prompts/index.js';
import listResultSchema from './list-result.json';
import { scopeOperation } from '../../lib/context/option.js';

const DEFAULT_LIST_TIMEOUT_MS = 90_000;

const { onlyJSON, contentIsTransformationSource } = promptConstants;

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Promise<Object>} Model options for llm
 */
function createModelOptions() {
  return {
    response_format: jsonSchema('list_result', listResultSchema),
  };
}

const outputTransformPrompt = (result, schema) => {
  return `${contentIsTransformationSource} ${result}

${asObjectWithSchemaPrompt(schema)}

${onlyJSON}`;
};

const shouldSkipDefault = ({ result, resultsAll } = {}) => {
  return resultsAll.includes(result);
};

const shouldStopDefault = ({ queryCount, startTime, queryLimit, timeoutMs } = {}) => {
  return queryCount > queryLimit || new Date() - startTime > timeoutMs;
};

export const generateList = async function* generateListGenerator(text, config = {}) {
  config = scopeOperation('list:generate', { llm: 'fastGoodCheap', ...config });
  const resultsAll = [];
  const resultsAllMap = {};
  let isDone = false;
  const { shouldSkip = shouldSkipDefault, shouldStop = shouldStopDefault } = config;
  const { queryLimit = 5, timeoutMs = DEFAULT_LIST_TIMEOUT_MS } = config;

  const startTime = new Date();
  let queryCount = 0;

  while (!isDone) {
    const listPrompt = generateListPrompt(text, {
      ...config,
      existing: resultsAll,
    });

    let resultsNew = [];
    try {
      // eslint-disable-next-line no-await-in-loop
      const results = await retry(
        () => callLlm(listPrompt, { ...config, ...createModelOptions() }),
        {
          label: 'list-generate',
          config,
        }
      );

      const resultArray = results?.items || results;
      resultsNew = Array.isArray(resultArray) ? resultArray.filter(Boolean) : [];
    } catch (error) {
      if (/The operation was aborted/.test(error.message)) {
        debug('Generate list [error]: Aborted');
        resultsNew = [];
      } else {
        debug(
          `Generate list [error]: ${error.message} ${listPrompt.slice(0, 100).replace('\n', '\\n')}`
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
        queryLimit,
        timeoutMs,
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

        yield result;
      }
    }

    const perQueryControlFactors = {
      result: undefined,
      resultsAll,
      resultsNew,
      queryCount,
      startTime,
      queryLimit,
      timeoutMs,
    };

    // eslint-disable-next-line no-await-in-loop
    if (await shouldStop(perQueryControlFactors)) {
      isDone = true;
    }
  }
};

export default async function list(prompt, config = {}) {
  config = scopeOperation('list', config);
  const { schema } = config;
  const fullPrompt = prompt;

  const response = await retry(() => callLlm(fullPrompt, { ...config, ...createModelOptions() }), {
    label: 'list-main',
    config,
  });

  // Extract items from the object structure
  const resultArray = response?.items || response;
  const items = Array.isArray(resultArray) ? resultArray : [];

  // If schema is provided, transform each item to match the schema
  if (schema && items.length > 0) {
    const transformedItems = [];
    for (const item of items) {
      const transformPrompt = outputTransformPrompt(item, schema);
      const transformResponse = await retry(() => callLlm(transformPrompt, config), {
        label: 'list-transform',
        config,
      });
      try {
        const transformedItem = JSON.parse(transformResponse);
        transformedItems.push(transformedItem);
      } catch (error) {
        debug(`list-transform JSON.parse failed, keeping original item: ${error.message}`);
        transformedItems.push(item);
      }
    }
    return transformedItems;
  }

  return items;
}
