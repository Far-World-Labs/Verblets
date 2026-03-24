import callLlm from '../../lib/llm/index.js';
import { emitChainResult, emitChainError } from '../../lib/progress-callback/index.js';
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
  const startTime = Date.now();

  try {
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

    const interpreted = result === 'undefined' ? undefined : result;

    emitChainResult(config, name, { duration: Date.now() - startTime });

    return interpreted;
  } catch (err) {
    emitChainError(config, name, err, { duration: Date.now() - startTime });

    throw err;
  }
};
