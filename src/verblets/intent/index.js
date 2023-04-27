import enums from '../enum/index.js';
import toObject from '../to-object/index.js';
import chatGPT from '../../lib/openai/completions.js';
import stripResponse from '../../lib/strip-response/index.js';
import { intent } from '../../prompts/index.js';

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

const enumPrompt = (text) => `What is the intent of the following prompt:
\`\`\`
${text}
\`\`\`

=== examples ===
For example: The intent of "Buy me a flight to Burgas" might be "buy-flight". The intent of "What is the tempature outside" might be "get-temperature".
=== end examples ===
`;

export default async ({
  text,
  operations,
  defaultIntent = completionIntent,
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
    })
  );

  return toObject(stripResponse(result));
};
