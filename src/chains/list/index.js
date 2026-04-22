import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { debug } from '../../lib/debug/index.js';
import {
  asObjectWithSchema as asObjectWithSchemaPrompt,
  generateList as generateListPrompt,
  constants as promptConstants,
} from '../../prompts/index.js';
import listResultSchema from './list-result.json' with { type: 'json' };
import { argumentMapResultSchema } from '../argument-map/index.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { resolveTexts } from '../../lib/instruction/index.js';

const name = 'list';

const KNOWN_TEXTS = ['outputFormat'];

const DEFAULT_LIST_TIMEOUT_MS = 90_000;

const { onlyJSON, contentIsTransformationSource } = promptConstants;

/**
 * Create model options for structured outputs
 * @param {string} [outputFormat] - Output format: undefined for default list, 'argument-map' for argument structure
 * @returns {Object} Model options for llm
 */
function createModelOptions(outputFormat) {
  if (outputFormat === 'argument-map') {
    return {
      responseFormat: jsonSchema('argument_map_result', argumentMapResultSchema),
    };
  }
  return {
    responseFormat: jsonSchema('list_result', listResultSchema),
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
  const { text: instructionText, context } = resolveTexts(text, []);
  const effectiveText = context ? `${instructionText}\n\n${context}` : instructionText;
  const runConfig = nameStep('list:generate', {
    llm: { fast: true, good: true, cheap: true },
    ...config,
  });
  const resultsAll = [];
  const resultsAllMap = {};
  let isDone = false;
  const { shouldSkip = shouldSkipDefault, shouldStop = shouldStopDefault } = runConfig;
  const { queryLimit = 5, timeoutMs = DEFAULT_LIST_TIMEOUT_MS } = runConfig;

  const startTime = new Date();
  let queryCount = 0;

  while (!isDone) {
    const listPrompt = generateListPrompt(effectiveText, {
      ...runConfig,
      existing: resultsAll,
    });

    let resultsNew = [];
    try {
      // eslint-disable-next-line no-await-in-loop
      const results = await retry(
        () => callLlm(listPrompt, { ...runConfig, ...createModelOptions() }),
        {
          label: 'list-generate',
          config: runConfig,
        }
      );

      const resultArray = results?.items || results;
      resultsNew = Array.isArray(resultArray) ? resultArray.filter(Boolean) : [];
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      debug(
        `Generate list [error]: ${error.message} ${listPrompt.slice(0, 100).replace('\n', '\\n')}`
      );
      isDone = true;
      break;
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
  const { text, known, context } = resolveTexts(prompt, KNOWN_TEXTS);
  const { outputFormat } = known;
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    const { schema } = runConfig;
    const fullPrompt = context ? `${text}\n\n${context}` : text;
    const response = await retry(
      () => callLlm(fullPrompt, { ...runConfig, ...createModelOptions(outputFormat) }),
      {
        label: 'list-main',
        config: runConfig,
      }
    );

    if (outputFormat === 'argument-map') {
      const result = {
        claims: Array.isArray(response?.claims) ? response.claims : [],
        evidence: Array.isArray(response?.evidence) ? response.evidence : [],
        counterarguments: Array.isArray(response?.counterarguments)
          ? response.counterarguments
          : [],
      };
      emitter.complete({ outcome: Outcome.success });
      return result;
    }

    // Extract items from the object structure
    const resultArray = response?.items || response;
    const items = Array.isArray(resultArray) ? resultArray : [];

    // If schema is provided, transform each item to match the schema
    if (schema && items.length > 0) {
      emitter.emit({ event: DomainEvent.step, stepName: 'transform', itemCount: items.length });
      const batchDone = emitter.batch(items.length);
      const transformedItems = [];
      for (const item of items) {
        const transformPrompt = outputTransformPrompt(item, schema);
        const transformResponse = await retry(() => callLlm(transformPrompt, runConfig), {
          label: 'list-transform',
          config: runConfig,
        });
        try {
          const transformedItem = JSON.parse(transformResponse);
          transformedItems.push(transformedItem);
        } catch (error) {
          debug(`list-transform JSON.parse failed, keeping original item: ${error.message}`);
          transformedItems.push(item);
        }
        batchDone(1);
      }
      emitter.complete({ outcome: Outcome.success });
      return transformedItems;
    }

    emitter.complete({ outcome: Outcome.success });
    return items;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

list.knownTexts = KNOWN_TEXTS;
