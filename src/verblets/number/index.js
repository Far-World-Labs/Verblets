import callLlm from '../../lib/llm/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { numberSchema } from './schema.js';

const {
  asNumber,
  asUndefinedByDefault,
  contentIsQuestion,
  explainAndSeparate,
  explainAndSeparatePrimitive,
} = promptConstants;

export default async (text, config = {}) => {
  const numberText = `${contentIsQuestion} ${text}

${explainAndSeparate} ${explainAndSeparatePrimitive}

${asNumber} ${asUndefinedByDefault}

The value should be the number or "undefined".`;

  const result = await callLlm(numberText, {
    ...config,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'number_extraction',
        schema: numberSchema,
      },
    },
  });

  return result === 'undefined' ? undefined : result;
};
