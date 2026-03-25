import callLlm from '../../lib/llm/index.js';
import { asSchemaOrgText } from '../../prompts/index.js';
import { schemaOrgSchemas } from '../../json-schemas/index.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';

const name = 'schema-org';

const getSchema = (type) => {
  const schema = schemaOrgSchemas[type.toLowerCase()];
  if (!schema) {
    throw new Error(`Unknown schema.org type: ${type}`);
  }
  return schema;
};

export default async (text, type, config = {}) => {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
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
    ...runConfig,
    response_format,
  });
  emitter.complete();
  return response;
};
