import callLlm from '../../lib/llm/index.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { asEnum, constants } from '../../prompts/index.js';
import { createEnumSchema } from './schema.js';

const { asUndefinedByDefault, contentIsQuestion, explainAndSeparate } = constants;

const name = 'enum';

export default async (text, enumVal, config = {}) => {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  const enumText = `${contentIsQuestion} ${text}\n\n${explainAndSeparate}

${asEnum(enumVal)} ${asUndefinedByDefault}

The value should be your selection.`;

  const schema = createEnumSchema(enumVal);

  try {
    const result = await callLlm(enumText, {
      ...runConfig,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'enum_selection',
          schema,
        },
      },
    });

    //TODO:DOCS_OBSERVATIONS string 'undefined' check is fragile — if the schema constrains to the enum values plus a sentinel, this becomes unnecessary
    // With auto-unwrapping, result should be the value directly
    const interpreted = result === 'undefined' ? undefined : result;

    emitter.complete({ outcome: 'success' });

    return interpreted;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
};
