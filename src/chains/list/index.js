import { operationTimeoutMultiplier } from '../../constants/models.js';
import chatGPT from '../../lib/chatgpt/index.js';
import {
  asObjectWithSchema as asObjectWithSchemaPrompt,
  generateList as generateListPrompt,
  constants as promptConstants,
} from '../../prompts/index.js';
import modelService from '../../services/llm-model/index.js';
import toObject from '../../verblets/to-object/index.js';

const { onlyJSON, contentIsTransformationSource } = promptConstants;

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
      // eslint-disable-next-line no-await-in-loop
      const results = await chatGPT(listPrompt, {
        modelOptions: {
          modelName: typeof model === 'string' ? model : model.name,
        },
        ...passThroughOptions,
      });

      // debug helper:
      // console.error(R.sort((a, b) => a.localeCompare(b), await toObject(results)));

      // eslint-disable-next-line no-await-in-loop
      resultsNew = await toObject(results);
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

export default async (text, options = {}) => {
  const { schema, model = 'fastGoodCheap', ...passThroughOptions } = options;
  const generator = generateList(text, options);

  const results = [];
  for await (const result of generator) {
    results.push(result);
  }

  if (!schema) {
    return results;
  }

  // Get model object for budgeting
  const modelObj = typeof model === 'string' ? modelService.getModel(model) : model;

  const resultObjects = await Promise.all(
    results.map(async (result) => {
      const prompt = outputTransformPrompt(result, schema);
      const budget = modelObj.budgetTokens(prompt);

      const resultObject = await chatGPT(prompt, {
        maxTokens: budget.completion,
        modelOptions: {
          modelName: typeof model === 'string' ? model : model.name,
        },
        ...passThroughOptions,
      });

      return toObject(resultObject);
    })
  );

  return resultObjects;
};
