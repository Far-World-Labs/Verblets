import chatGPT from '../../lib/openai/completions.js';
import {
  asObjectWithSchema as asObjectWithSchemaPrompt,
  generateCollection as generateCollectionPrompt,
} from '../../prompts/fragment-functions/index.js'
import {
  toObject,
} from '../../response-parsers/index.js';

export default async (message, options) => {
  const results = await chatGPT(`${generateCollectionPrompt(message, options)}`, { maxTokens: 3000 });

  const resultObjects = toObject(results);
  const resultObjectsEnhanced = [];
  for (let resultObject of resultObjects) {
    const resultObjectComplete = (options.properties ?? [])
      .every(prop => prop in resultObject);
    if (resultObjectComplete) {
      resultObjectsEnhanced.push(resultObject);
      continue;
    }

    if (!resultObjectComplete) {
      const resultObjectEnhanced = await chatGPT(`${transform}: ${JSON.stringify(resultObject)}

        ${asObjectWithSchemaPrompt(options.jsonSchema)}

${onlyJSON}`);
      resultObjectsEnhanced.push(toObject(resultObjectEnhanced));
    }
  }

  return resultObjectsEnhanced;
};
