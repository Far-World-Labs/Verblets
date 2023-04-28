import {
  onlyJSON,
  onlyJSONObjectArray,
  contentListItemCriteria,
  tryCompleteData,
} from './constants.js';
import asObjectWithSchema from './as-object-with-schema.js';

const jsonSchemaDefault = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
  },
};

export default (text, { jsonSchema = jsonSchemaDefault } = {}) => {
  return `Make an array of "${text}" objects.

${contentListItemCriteria}
 - ${asObjectWithSchema(jsonSchema)}
 - ${tryCompleteData}

${onlyJSON} ${onlyJSONObjectArray}`;
};
