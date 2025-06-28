import { contentIsSchema, onlyJSON } from './constants.js';
import asSchemaOrgType from './as-schema-org-type.js';
import { asXML } from './wrap-variable.js';

const ensureNumbers = 'ensure values meant to be numbers are numbers';
const ensureSchemaOrgType = 'ensure the type is a real schema.org type';
const ensureProperties = 'ensure the returned object has @context, name';

export default (object, type, schema) => {
  const typeText = `${asSchemaOrgType(type)}`;
  const schemaText = schema
    ? `\n${contentIsSchema} ${asXML(JSON.stringify(schema), {
        tag: 'schema',
      })}`
    : '';

  return `Give me "${object}" in schema.org JSON format with a full set of properties. ${
    typeText ? `${typeText}.` : ''
  }
- ${ensureNumbers}
- ${ensureSchemaOrgType}
- ${ensureProperties}
${schemaText}
${onlyJSON}`;
};
