/* eslint-disable no-await-in-loop */

import { operationTimeoutMultiplier } from '../../constants/openai.js';
import chatGPT from '../../lib/chatgpt/index.js';
import {
  constants as promptConstants,
  asObjectWithSchema as asObjectWithSchemaPrompt,
  generateList as generateListPrompt,
} from '../../prompts/index.js';
import modelService from '../../services/llm-model/index.js';
import toObject from '../../verblets/to-object/index.js';

const { onlyJSON, contentIsTransformationSource } = promptConstants;

const outputTransformPrompt = (result, jsonSchema) => {
  return `${contentIsTransformationSource} ${result}

${asObjectWithSchemaPrompt(jsonSchema)}

${onlyJSON}`;
};

const shouldSkipDefault = ({ result, resultsAll } = {}) => {
  return resultsAll.includes(result);
};

const shouldStopDefault = ({ queryCount, startTime } = {}) => {
  return (
    queryCount > 5 ||
    new Date() - startTime >
      operationTimeoutMultiplier *
        modelService.getBestAvailableModel().requestTimeout
  );
};

export const generateList = async function* generateListGenerator(
  text,
  options = {}
) {
  const resultsAll = [];
  const resultsAllMap = {};
  let isDone = false;
  const {
    shouldSkip = shouldSkipDefault,
    shouldStop = shouldStopDefault,
    model = modelService.getBestAvailableModel(),
  } = options;

  const startTime = new Date();
  let queryCount = 0;

  while (!isDone) {
    const listPrompt = generateListPrompt(text, {
      ...options,
      existing: resultsAll,
    });

    const budget = model.budgetTokens(listPrompt);

    let resultsNew = [];
    try {
      const results = await chatGPT(listPrompt, {
        modelOptions: {
          maxTokens: budget.completion,
        },
        ...options,
      });

      // debug helper:
      // console.error(R.sort((a, b) => a.localeCompare(b), await toObject(results)));

      resultsNew = await toObject(results);
    } catch (error) {
      if (/The operation was aborted/.test(error.message)) {
        console.error('Generate list [error]: Aborted');
        resultsNew = []; // continue
      } else {
        console.error(
          `Generate list [error]: ${error.message}`,
          listPrompt.slice(0, 100).replace('\n', '\\n')
        );
        isDone = true;
        break;
      }
    }

    const resultsNewUnique = resultsNew.filter(
      (item) => !(item in resultsAllMap)
    );

    queryCount += 1;

    for (const result of resultsNewUnique) {
      const perResultControlFactors = {
        result,
        resultsAll,
        resultsNew,
        queryCount,
        startTime,
      };

      if (await shouldStop(perResultControlFactors)) {
        isDone = true;
        break;
      }

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

    if (await shouldStop(perQueryControlFactors)) {
      isDone = true;
    }
  }
};

export default async (text, options) => {
  const generator = generateList(text, options);
  const { jsonSchema, model = modelService.getBestAvailableModel() } =
    options ?? {};

  const results = [];
  for await (const result of generator) {
    results.push(result);
  }

  if (!jsonSchema) {
    return results;
  }

  const resultObjects = await Promise.all(
    results.map(async (result) => {
      const prompt = outputTransformPrompt(result, jsonSchema);
      const budget = model.budgetTokens(prompt);

      const resultObject = await chatGPT(prompt, {
        maxTokens: budget.completion,
        ...options,
      });

      return toObject(resultObject);
    })
  );

  return resultObjects;
};
