import { asXML } from './wrap-variable.js';
import { onlyJSON } from './constants.js';
import intentSchema from '../json-schemas/intent.json';

const contentIsIntent = 'The intent is:';
const contentIsSchema = 'The schema is:';
const contentIsExample = 'An example of the output is:';
const contentIsOperationOption = 'The possible operations are:';
const contentIsParametersOptions = 'The possible parameters are:';

const exampleJSON = `{
  "intent": "play_music",
  "parameters": {
    "genre": "rock"
  },
  "optionalParameters": {
    "artist": "The Beatles"
  }
}`;

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
${contentIsIntent} ${asXML(text ?? 'None given', { tag: 'input' })}

${contentIsSchema} ${asXML(intentSchema ?? 'None given', {
    tag: 'schema',
  })}

${contentIsExample} ${asXML(exampleJSON ?? 'None given', {
    tag: 'example',
  })}
${operationsSection ?? ''}${parametersSection ?? ''}
Ensure the result is sufficiently abstract.
Include the full list of supplied parameters.
Don't include optional parameters under "parameters" unless they were found when the intent was parsed.

${onlyJSON}
`;
};
