import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { nameStep } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
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

const verbletName = 'number';

export default async function number(text, config = {}) {
  const { text: inputText, context } = resolveTexts(text, []);
  const runConfig = nameStep(verbletName, config);
  const emitter = createProgressEmitter(verbletName, runConfig.onProgress, runConfig);
  emitter.start();

  const numberText = [
    `${contentIsQuestion} ${asXML(inputText, { tag: 'text' })}

${explainAndSeparate} ${explainAndSeparatePrimitive}

${asNumber} ${asUndefinedByDefault}

The value should be the number or "undefined".`,
    context,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const result = await callLlm(numberText, {
      ...runConfig,
      responseFormat: jsonSchema('number_extraction', numberSchema),
    });

    const interpreted = result === 'undefined' ? undefined : result;

    emitter.complete({ outcome: Outcome.success });

    return interpreted;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

number.knownTexts = [];
