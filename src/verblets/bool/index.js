import chatGPT from '../../lib/chatgpt/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { booleanSchema } from './schema.js';

const {
  asBool,
  asUndefinedByDefault,
  explainAndSeparate,
  explainAndSeparatePrimitive,
  asJSON,
  asWrappedValueJSON,
} = promptConstants;

export default async (text, config = {}) => {
  const { llm, ...options } = config;
  const systemPrompt = `${explainAndSeparate} ${explainAndSeparatePrimitive}

${asBool} ${asUndefinedByDefault}

${asWrappedValueJSON} The value should be "true", "false", or "undefined".

${asJSON}`;

  const response = await chatGPT(text, {
    modelOptions: {
      systemPrompt,
      ...llm,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'boolean_evaluation',
          schema: booleanSchema,
        },
      },
    },
    ...options,
  });

  return response === 'true' ? true : response === 'false' ? false : undefined;
};
