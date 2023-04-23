import * as R from 'ramda';

import {
  operationTimeout,
} from '../../constants/common.js';
import chatGPT from '../../lib/openai/completions.js';
import budgetTokens from '../../lib/budget-tokens/index.js';
import {
  asObjectWithSchema as asObjectWithSchemaPrompt,
  generateList as generateListPrompt,
} from '../../prompts/fragment-functions/index.js'
import {
  onlyJSON,
  transform,
} from '../../prompts/fragment-texts/index.js'
import toObject from '../../verblets/to-object/index.js';

const outputTransformPrompt = (result, jsonSchema) => {
  return `${transform} ${result}

${asObjectWithSchemaPrompt(jsonSchema)}

${onlyJSON}`;
};

const shouldSkipDefault = async ({ result, resultsAll }={}) => {
  return resultsAll.includes(result);
};

const shouldStopDefault = async ({ startTime }={}) => {
  return ((new Date()) - startTime) > operationTimeout;
};

export const generateList = async function* (text, options={}) {
  const resultsAll = [];
  const resultsAllMap = {};
  let isDone = false;
  const {
    shouldSkip=shouldSkipDefault,
    shouldStop=shouldStopDefault,
  } = options;

  const startTime = new Date();
  let queryCount = 0;

  while (!isDone) {
    const listPrompt = generateListPrompt(text, { ...options, existing: resultsAll });

    const budget = budgetTokens(listPrompt);

    let resultsNew = [];
    try {
      const results = await chatGPT(listPrompt, {
        maxTokens: budget.completion,
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
        console.error(`Generate list [error]: ${error.message}`, listPrompt.slice(0, 100).replace('\n', '\\n'));
        isDone = true;
        break;
      }
    }

    const resultsNewUnique = resultsNew.filter(item => !(item in resultsAllMap));

    queryCount = queryCount + 1;

    for (let result of resultsNewUnique) {
      const perResultControlFactors = {
        result,
        resultsAll,
        resultsNew,
        queryCount,
        startTime
      };

      if (await shouldStop(perResultControlFactors)) {
        isDone = true;
        break;
      }

      if (await shouldSkip(perResultControlFactors)) {
        continue;
      }

      resultsAllMap[result] = true;
      resultsAll.push(result);

      // debug helper:
      // console.error(R.sort((a, b) => a.localeCompare(b), resultsAll));

      yield result;
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

export default async (text, options={}) => {
  const generator = generateList(text, options);
  const results = [];
  for await (let result of generator) {
    results.push(result);
  }

  if (!options.jsonSchema) {
    return results;
  }

  const resultObjects = [];
  let i = 0;
  let result = results[i];
  while (result) {
    result = results[i];
    const prompt = outputTransformPrompt(result, options.jsonSchema);

    const budget = budgetTokens(prompt);

    const resultObject = await chatGPT(prompt, {
      maxTokens: budget.completion,
      ...options,
    });

    // debug helper
    // console.log(resultObject);

    resultObjects.push(await toObject(resultObject));

    i = i + 1;
    result = results[i];
  }

  return resultObjects;
};
