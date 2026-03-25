import callLlm from '../../lib/llm/index.js';
import { nameStep, track } from '../../lib/context/option.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { numberSchema } from './schema.js';

const {
  asNumber,
  asUndefinedByDefault,
  contentIsQuestion,
  explainAndSeparate,
  explainAndSeparatePrimitive,
} = promptConstants;

const name = 'number';

export default async (text, config = {}) => {
  const runConfig = nameStep(name, config);
  const span = track(name, runConfig);

  const numberText = `${contentIsQuestion} ${text}

${explainAndSeparate} ${explainAndSeparatePrimitive}

${asNumber} ${asUndefinedByDefault}

The value should be the number or "undefined".`;

  const result = await callLlm(numberText, {
    ...runConfig,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'number_extraction',
        schema: numberSchema,
      },
    },
  });

  const interpreted = result === 'undefined' ? undefined : result;

  span.result();

  return interpreted;
};
