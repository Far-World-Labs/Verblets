import { onlyJSON } from '../fragment-texts/index.js';
import {
  asObjectWithSchema,
} from './output-modifiers.js';

const jsonSchemaDefault = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
  },
};

export default (text, { jsonSchema=jsonSchemaDefault }={}) => {
  return `Make an array of "${text}" objects.

Do the following with each returned object:
 - ${asObjectWithSchema(jsonSchema)}
 - Err towards having complete data, even if you have to guess.

${onlyJSON} Return an array, not just the objects.`
};