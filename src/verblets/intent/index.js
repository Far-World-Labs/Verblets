import enums from '../enum/index.js';
import toObject from '../to-object/index.js';
import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';

import { constants, intent, wrapVariable } from '../../prompts/index.js';

const { contentHasIntent } = constants;
const example1 =
  'The intent of "Buy me a flight to Burgas" might be "buy-flight"';
const example2 =
  'The intent of "What is the tempature outside" might be "get-temperature"';

const enumPrompt = (text) => `${contentHasIntent} ${wrapVariable(text, {
  tag: 'message',
})}

${wrapVariable(example1, { tag: 'example' })}
${wrapVariable(example2, { tag: 'example' })}`;

const completionIntent = (text) => ({
  queryText: text,
  intent: {
    operation: 'completion',
    displayName: 'Completion',
  },
  parameters: {
    text,
  },
});

export default async ({
  text,
  operations,
  defaultIntent = completionIntent,
  options,
} = {}) => {
  let operationsFound;
  let parametersFound;
  if (operations) {
    const operationsEnum = operations.reduce(
      (acc, item, idx) => ({
        ...acc,
        [item.name]: idx,
      }),
      {}
    );

    const operationNameFound = await enums(enumPrompt(text), operationsEnum);

    const operationFound = operations.find(
      (o) => o.name === operationNameFound
    );

    if (!operationFound) {
      return defaultIntent(text);
    }

    operationsFound = [operationFound.name];
    parametersFound = operationFound.parameters;
  }

  const result = await chatGPT(
    intent(text, {
      operations: operationsFound,
      parameters: parametersFound,
    }),
    options
  );

  return toObject(stripResponse(result));
};
