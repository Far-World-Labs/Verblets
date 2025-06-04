import {
  contentListItemCriteria,
  onlyJSON,
  onlyJSONObjectArray,
  tryCompleteData,
} from './constants.js';
import asObjectWithSchema from './as-object-with-schema.js';

const schemaDefault = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
  },
};

export default (text, { schema = schemaDefault } = {}) => {
  return `Make an array of "${text}" objects.

${contentListItemCriteria}
 - ${asObjectWithSchema(schema)}
 - ${tryCompleteData}

${onlyJSON} ${onlyJSONObjectArray}`;
};
