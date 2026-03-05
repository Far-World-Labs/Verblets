import callLlm from '../../lib/llm/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { numberSchema } from './schema.js';

const {
  asNumber,
  asUndefinedByDefault,
  contentIsQuestion,
  explainAndSeparate,
  explainAndSeparatePrimitive,
  asJSON,
  asWrappedValueJSON,
} = promptConstants;

export default async (text, config = {}) => {
  const { llm, ...options } = config;
  const numberText = `${contentIsQuestion} ${text}

${explainAndSeparate} ${explainAndSeparatePrimitive}

${asNumber} ${asUndefinedByDefault}

${asWrappedValueJSON} The value should be the number or "undefined".

${asJSON}`;

  const result = await callLlm(numberText, {
    llm,
    modelOptions: {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'number_extraction',
          schema: numberSchema,
        },
      },
    },
    ...options,
  });

  return result === 'undefined' ? undefined : result;
};
