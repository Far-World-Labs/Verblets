import callLlm from '../../lib/llm/index.js';
import { asSchemaOrgText } from '../../prompts/index.js';
import { schemaOrgSchemas } from '../../json-schemas/index.js';

const getSchema = (type) => {
  const schema = schemaOrgSchemas[type.toLowerCase()];
  if (!schema) {
    throw new Error(`Unknown schema.org type: ${type}`);
  }
  return schema;
};

export default async (text, type, config = {}) => {
  const schema = type ? getSchema(type) : undefined;

  const response_format = schema
    ? {
        type: 'json_schema',
        json_schema: {
          name: `schema_org_${type.toLowerCase()}`,
          schema,
        },
      }
    : { type: 'json_object' };

  const response = await callLlm(asSchemaOrgText(text, type, schema), {
    ...config,
    response_format,
  });
  return response;
};
