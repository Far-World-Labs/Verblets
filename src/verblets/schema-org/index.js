import callLlm from '../../lib/llm/index.js';
import { asSchemaOrgText } from '../../prompts/index.js';
import { schemaOrgSchemas } from '../../json-schemas/index.js';
import { emitChainResult, emitChainError } from '../../lib/progress-callback/index.js';

const name = 'schema-org';

const getSchema = (type) => {
  const schema = schemaOrgSchemas[type.toLowerCase()];
  if (!schema) {
    throw new Error(`Unknown schema.org type: ${type}`);
  }
  return schema;
};

export default async (text, type, config = {}) => {
  const startTime = Date.now();
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

  try {
    const response = await callLlm(asSchemaOrgText(text, type, schema), {
      ...config,
      response_format,
    });
    emitChainResult(config, name, { duration: Date.now() - startTime });
    return response;
  } catch (err) {
    emitChainError(config, name, err, { duration: Date.now() - startTime });
    throw err;
  }
};
