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

const defaultTimeout = 30000;

const shouldSkipDefault = async ({ result, resultsAll }={}) => {
  return resultsAll.includes(result);
};

const shouldStopDefault = async ({ startTime }={}) => {
  return ((new Date()) - startTime) > defaultTimeout;
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

    let resultsNew = [];
    try {

      const budget = budgetTokens(listPrompt);
      const results = await chatGPT(listPrompt, {
        maxTokens: budget.completion,
        abortTimeout: 5000,
        ...options,
      });

      resultsNew = await toObject(results);
    } catch (error) {
      if (/The operation was aborted/.test(error.message)) {
        resultsNew = []; // continue
      } else {
        console.error(`Generate list [error]: ${error.message}`, listPrompt);
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
  for (let result of results) {
    const resultObject = await chatGPT(`${transform} ${result}

      ${asObjectWithSchemaPrompt(options.jsonSchema)}

${onlyJSON}`);
    resultObjects.push(await toObject(resultObject));
  }

  return resultObjects;
};
