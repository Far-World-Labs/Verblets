import fs from 'node:fs/promises';
import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import { asSchemaOrgText } from '../../prompts/index.js';

const getSchema = async (type) => {
  return JSON.parse(
    await fs.readFile(`./src/json-schemas/schema-dot-org-${type.toLowerCase()}.json`)
  );
};

export default async (text, type, config = {}) => {
  const { llm, ...options } = config;
  const schema = type ? await getSchema(type) : undefined;

  const modelOptions = schema
    ? {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: `schema_org_${type.toLowerCase()}`,
            schema,
          },
        },
        ...llm,
      }
    : {
        response_format: { type: 'json_object' },
        ...llm,
      };

  const response = await chatGPT(asSchemaOrgText(text, type, schema), {
    modelOptions,
    ...options,
  });
  return JSON.parse(stripResponse(response));
};
