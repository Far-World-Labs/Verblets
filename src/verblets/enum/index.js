import chatGPT from '../../lib/chatgpt/index.js';
import { asEnum, constants } from '../../prompts/index.js';
import { createEnumSchema } from './schema.js';

const { asUndefinedByDefault, contentIsQuestion, explainAndSeparate, asJSON, asWrappedValueJSON } =
  constants;

export default async (text, enumVal, config = {}) => {
  const { llm, ...options } = config;
  const enumText = `${contentIsQuestion} ${text}\n\n${explainAndSeparate}

${asEnum(enumVal)} ${asUndefinedByDefault}

${asWrappedValueJSON} The value should be your selection.

${asJSON}`;

  const schema = createEnumSchema(enumVal);

  const result = await chatGPT(enumText, {
    modelOptions: {
      ...llm,
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
