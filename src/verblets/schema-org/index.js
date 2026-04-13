import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { asSchemaOrgText } from '../../prompts/index.js';
import { schemaOrgSchemas } from '../../json-schemas/index.js';
import { nameStep } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';

const verbletName = 'schema-org';

const getSchema = (type) => {
  const schema = schemaOrgSchemas[type.toLowerCase()];
  if (!schema) {
    throw new Error(`Unknown schema.org type: ${type}`);
  }
  return schema;
};

export default async function schemaOrg(text, type, config = {}) {
  const { text: inputText, context } = resolveTexts(text, []);
  const effectiveText = context ? `${inputText}\n\n${context}` : inputText;
  const runConfig = nameStep(verbletName, config);
  const emitter = createProgressEmitter(verbletName, runConfig.onProgress, runConfig);
  emitter.start();
  try {
    const schema = type ? getSchema(type) : undefined;

    const responseFormat = schema
      ? jsonSchema(`schema_org_${type.toLowerCase()}`, schema)
      : { type: 'json_object' };

    const response = await callLlm(asSchemaOrgText(effectiveText, type, schema), {
      ...runConfig,
      responseFormat,
    });
    emitter.complete({ outcome: Outcome.success });
    return response;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

schemaOrg.knownTexts = [];
