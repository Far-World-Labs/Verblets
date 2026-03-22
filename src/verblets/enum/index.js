import callLlm from '../../lib/llm/index.js';
import { asEnum, constants } from '../../prompts/index.js';
import { createEnumSchema } from './schema.js';

const { asUndefinedByDefault, contentIsQuestion, explainAndSeparate } = constants;

export default async (text, enumVal, config = {}) => {
  const { llm, ...options } = config;
  const enumText = `${contentIsQuestion} ${text}\n\n${explainAndSeparate}

${asEnum(enumVal)} ${asUndefinedByDefault}

The value should be your selection.`;

  const schema = createEnumSchema(enumVal);

  const result = await callLlm(enumText, {
    llm,
    modelOptions: {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'enum_selection',
          schema,
        },
      },
    },
    ...options,
  });

  // With auto-unwrapping, result should be the value directly
  return result === 'undefined' ? undefined : result;
};
