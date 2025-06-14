import fs from 'node:fs/promises';

import {
  contentIsExample,
  contentIsSchema,
  onlyJSON,
  contentIsIntent,
  contentIsOperationOption,
  contentIsParametersOptions,
} from './constants.js';
import wrapVariable from './wrap-variable.js';

const exampleJSON = `{
  "queryText": "play some music",
  "intent": {
    "operation": "play-music",
    "displayName": "Play Music"
  },
  "parameters": {
    "genre": "rock"
  },
  "optionalParameters": {
    "artist": "The Beatles"
  }
}`;

const intentSchema = JSON.parse(await fs.readFile('./src/json-schemas/intent.json'));

/**
 * Approximates intent recognition like you might find with Wit.ai,
 * for tasks where you want the model to extract the intent and parameters
 * so an existing function can compute the result.
 */
export default (text, { operations = [], parameters = [] } = {}) => {
  let operationsSection = '';
  if (operations.length) {
    operationsSection = `\n${contentIsOperationOption} ${operations.join(', ')}\n`;
  }
  let parametersSection = '';
  if (parameters.length) {
    parametersSection = `\n${contentIsParametersOptions} ${parameters.join(', ')}\n`;
  }

  return `
${contentIsIntent} ${wrapVariable(text ?? 'None given', { tag: 'input' })}

${contentIsSchema} ${wrapVariable(intentSchema ?? 'None given', {
    tag: 'schema',
  })}

${contentIsExample} ${wrapVariable(exampleJSON ?? 'None given', {
    tag: 'example',
  })}
${operationsSection ?? ''}${parametersSection ?? ''}
Ensure the result is sufficiently abstract.
Include the full list of supplied parameters.
Don't include optional parameters under "parameters" unless they were found when the intent was parsed.

${onlyJSON}
`;
};
