import callLlm from '../../lib/llm/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { booleanSchema } from './schema.js';

const name = 'bool';

const { asBool, asUndefinedByDefault, explainAndSeparate, explainAndSeparatePrimitive } =
  promptConstants;

export default async (text, config = {}) => {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  const systemPrompt = `${explainAndSeparate} ${explainAndSeparatePrimitive}

${asBool} ${asUndefinedByDefault}

The value should be "true", "false", or "undefined".`;

  try {
    const response = await callLlm(text, {
      ...runConfig,
      systemPrompt,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'boolean_evaluation',
          schema: booleanSchema,
        },
      },
    });

    // Interpret response
    const interpreted = response === 'true' ? true : response === 'false' ? false : undefined;

    emitter.complete({ outcome: 'success' });

    return interpreted;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
};
