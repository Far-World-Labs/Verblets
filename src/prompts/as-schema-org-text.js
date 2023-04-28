import { onlyJSON } from './constants.js';
import asSchemaOrgType from './as-schema-org-type.js';

const ensureNumbers = 'ensure values meant to be numbers are numbers';
const ensureSchemaOrgType = 'ensure the type is a real schema.org type';
const ensureProperties = 'ensure the returned object has @context, name';

export default (object, type) => {
  const typeText = `${asSchemaOrgType(type)}`;
  return `Give me "${object}" in schema.org JSON format with a full set of properties. ${
    typeText ? `${typeText}.` : ''
  }
- ${ensureNumbers}
- ${ensureSchemaOrgType}
- ${ensureProperties}
${onlyJSON}`;
};
