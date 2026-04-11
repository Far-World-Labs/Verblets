import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';
import { asEnum, constants } from '../../prompts/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { createEnumSchema } from './schema.js';

const { asUndefinedByDefault, contentIsQuestion, explainAndSeparate } = constants;

const name = 'enum';

export default async (text, enumVal, config = {}) => {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  const enumText = `${contentIsQuestion} ${asXML(text, { tag: 'text' })}\n\n${explainAndSeparate}

${asEnum(enumVal)} ${asUndefinedByDefault}

The value should be your selection.`;

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
};
