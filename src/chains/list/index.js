import chatGPT from '../../lib/openai/completions.js';
import {
  asObjectWithSchema as asObjectWithSchemaPrompt,
  generateList as generateListPrompt,
} from '../../prompts/fragment-functions/index.js'
import {
  onlyJSON,
  transform,
} from '../../prompts/fragment-texts/index.js'
import toObject from '../../verblets/to-object/index.js';

const shouldSkipNull = async ({ result, resultsAll }={}) => {
  return resultsAll.includes(result);
};

const shouldStopNull = async ({ result, resultsAll, resultsNew, attempts=0 }={}) => {
  return resultsAll.length > 30 || attempts > 5;
};

export const generateList = async function* (text, options={}) {
  const resultsAll = [];
  const resultsAllMap = {};
  let isDone = false;
  const { shouldSkip=shouldSkipNull, shouldStop=shouldStopNull } = options;

  let attempts = 0;
  while (!isDone) {
    let resultsNew;
    try {
      const listPrompt = `${generateListPrompt(text, { ...options, existing: resultsAll })}`;

      const results = await chatGPT(listPrompt, { maxTokens: 3000, ...options });
      resultsNew = await toObject(results);
    } catch (error) {
      console.error(`Generate list [error]: ${error.message}`);
      isDone = true;
    }

    const resultsNewUnique = resultsNew.filter(item => !(item in resultsAllMap));

    attempts = attempts + 1;

    for (let result of resultsNewUnique) {
      if (await shouldSkip({ result, resultsAll })) {
        continue;
      }

      if (await shouldStop({ result, resultsAll, resultsNew, attempts })) {
        isDone = true;
        break;
      }
      resultsAllMap[result] = true;
      resultsAll.push(result);
      yield result;
    }
    if (await shouldStop({
      result: undefined,
      resultsAll: [],
      resultsNew: [],
      attempts
    })) {
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
