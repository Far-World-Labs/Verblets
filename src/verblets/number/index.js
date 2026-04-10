import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
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
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  const numberText = `${contentIsQuestion} ${asXML(text, { tag: 'text' })}

${explainAndSeparate} ${explainAndSeparatePrimitive}

${asNumber} ${asUndefinedByDefault}

The value should be the number or "undefined".`;

  try {
    const result = await callLlm(numberText, {
      ...runConfig,
      response_format: jsonSchema('number_extraction', numberSchema),
    });

    const interpreted = result === 'undefined' ? undefined : result;

    emitter.complete({ outcome: Outcome.success });

    return interpreted;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
};
