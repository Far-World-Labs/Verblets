import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { nameStep } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';
import { asEnum, constants } from '../../prompts/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { createEnumSchema } from './schema.js';

const { asUndefinedByDefault, contentIsQuestion, explainAndSeparate } = constants;

const verbletName = 'enum';

export default async function enumVerblet(text, enumVal, config = {}) {
  const { text: inputText, context } = resolveTexts(text, []);

  const runConfig = nameStep(verbletName, config);
  const emitter = createProgressEmitter(verbletName, runConfig.onProgress, runConfig);
  emitter.start();

  const enumText = [
    `${contentIsQuestion} ${asXML(inputText, { tag: 'text' })}\n\n${explainAndSeparate}

${asEnum(enumVal)} ${asUndefinedByDefault}

The value should be your selection.`,
    context,
  ]
    .filter(Boolean)
    .join('\n\n');

  const schema = createEnumSchema(enumVal);

  try {
    const result = await callLlm(enumText, {
      ...runConfig,
      responseFormat: jsonSchema('enum_selection', schema),
    });

    // With auto-unwrapping, result should be the value directly
    const interpreted = result === 'undefined' ? undefined : result;

    emitter.complete({ outcome: Outcome.success });

    return interpreted;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

enumVerblet.knownTexts = [];
