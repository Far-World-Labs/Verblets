import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import {
  asObjectWithSchema as asObjectWithSchemaPrompt,
  generateList as generateListPrompt,
  constants as promptConstants,
} from '../../prompts/index.js';
import listResultSchema from './list-result.json' with { type: 'json' };
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { resolveTexts } from '../../lib/instruction/index.js';

const name = 'list';

const KNOWN_TEXTS = [];

const DEFAULT_LIST_TIMEOUT_MS = 90_000;

const { onlyJSON, contentIsTransformationSource } = promptConstants;

/**
 * Create model options for structured outputs
 * @returns {Object} Model options for llm
 */
function createModelOptions() {
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

    // eslint-disable-next-line no-await-in-loop
    const results = await retry(
      () => callLlm(listPrompt, { ...runConfig, ...createModelOptions() }),
      {
        label: 'list-generate',
        config: runConfig,
      }
    );

    const resultArray = results?.items || results;
    if (!Array.isArray(resultArray)) {
      throw new Error(`generateList: expected array response from LLM, got ${typeof resultArray}`);
    }
    const resultsNew = resultArray.filter(Boolean);

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
  const { text, context } = resolveTexts(prompt, KNOWN_TEXTS);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    const { schema } = runConfig;

    // Validate caller-supplied schema at the boundary so transform calls don't
    // explode mid-flow with cryptic errors.
    if (schema !== undefined) {
      if (
        !schema ||
        typeof schema !== 'object' ||
        !schema.properties ||
        typeof schema.properties !== 'object'
      ) {
        throw new Error('list: schema must be a JSON-schema object with a properties map');
      }
    }

    const fullPrompt = context ? `${text}\n\n${context}` : text;
    const response = await retry(
      () => callLlm(fullPrompt, { ...runConfig, ...createModelOptions() }),
      {
        label: 'list-main',
        config: runConfig,
      }
    );

    // Extract items from the object structure; throw if shape is wrong rather
    // than silently substituting [].
    const resultArray = response?.items || response;
    if (!Array.isArray(resultArray)) {
      throw new Error(`list: expected array response from LLM, got ${typeof resultArray}`);
    }
    const items = resultArray;

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
          transformedItems.push(JSON.parse(transformResponse));
        } catch (error) {
          throw new Error(
            `list: transform returned non-JSON for item ${JSON.stringify(item)}: ${error.message}`
          );
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
