import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { debug } from '../../lib/debug/index.js';
import {
  asObjectWithSchema as asObjectWithSchemaPrompt,
  generateList as generateListPrompt,
  constants as promptConstants,
} from '../../prompts/index.js';
import listResultSchema from './list-result.json';
import { resolveAll, withOperation } from '../../lib/context/resolve.js';

const DEFAULT_LIST_TIMEOUT_MS = 90_000;

const { onlyJSON, contentIsTransformationSource } = promptConstants;

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Promise<Object>} Model options for llm
 */
function createModelOptions() {
  return {
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'list_result',
        schema: listResultSchema,
      },
    },
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

export const generateList = async function* generateListGenerator(text, options = {}) {
  options = withOperation('list:generate', options);
  const resultsAll = [];
  const resultsAllMap = {};
  let isDone = false;
  const { shouldSkip = shouldSkipDefault, shouldStop = shouldStopDefault } = options;
  const { llm, maxAttempts, retryDelay, retryOnAll, queryLimit, timeoutMs } = await resolveAll(
    options,
    {
      llm: 'fastGoodCheap',
      maxAttempts: 3,
      retryDelay: 1000,
      retryOnAll: false,
      queryLimit: 5,
      timeoutMs: DEFAULT_LIST_TIMEOUT_MS,
    }
  );

  const startTime = new Date();
  let queryCount = 0;

  while (!isDone) {
    const listPrompt = generateListPrompt(text, {
      ...options,
      existing: resultsAll,
    });

    let resultsNew = [];
    try {
      const modelOptions = createModelOptions();
      // eslint-disable-next-line no-await-in-loop
      const results = await retry(() => callLlm(listPrompt, { ...options, llm, modelOptions }), {
        label: 'list-generate',
        maxAttempts,
        retryDelay,
        retryOnAll,
        onProgress: options.onProgress,
        abortSignal: options.abortSignal,
      });

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
  config = withOperation('list', config);
  const { schema } = config;
  const { llm, maxAttempts, retryDelay, retryOnAll } = await resolveAll(config, {
    llm: undefined,
    maxAttempts: 3,
    retryDelay: 1000,
    retryOnAll: false,
  });
  const fullPrompt = prompt;

  const modelOptions = createModelOptions();
  const response = await retry(() => callLlm(fullPrompt, { ...config, llm, modelOptions }), {
    label: 'list-main',
    maxAttempts,
    retryDelay,
    retryOnAll,
    onProgress: config.onProgress,
    abortSignal: config.abortSignal,
  });

  // Extract items from the object structure
  const resultArray = response?.items || response;
  const items = Array.isArray(resultArray) ? resultArray : [];

  // If schema is provided, transform each item to match the schema
  if (schema && items.length > 0) {
    const transformedItems = [];
    for (const item of items) {
      const transformPrompt = outputTransformPrompt(item, schema);
      const transformResponse = await retry(() => callLlm(transformPrompt, { ...config, llm }), {
        label: 'list-transform',
        maxAttempts,
        retryDelay,
        retryOnAll,
        onProgress: config.onProgress,
        abortSignal: config.abortSignal,
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
