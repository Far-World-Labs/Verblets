import callLlm from '../../lib/llm/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { extractLLMConfig, extractPromptAnalysis, extractResultValue } from '../../lib/progress/extract.js';
import { DomainEvent, Level } from '../../lib/progress/constants.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { booleanSchema } from './schema.js';

const name = 'bool';

const { asBool, asUndefinedByDefault, explainAndSeparate, explainAndSeparatePrimitive } =
  promptConstants;

export default async (text, config = {}) => {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start({ message: 'Bool verblet starting' });

  const systemPrompt = `${explainAndSeparate} ${explainAndSeparatePrimitive}

${asBool} ${asUndefinedByDefault}

The value should be "true", "false", or "undefined".`;

  // Log prompt construction with extracted analysis
  emitter.emit({
    event: DomainEvent.step,
    stepName: 'construction',
    level: Level.debug,
    ...extractPromptAnalysis(systemPrompt),
    ...extractLLMConfig(runConfig.llm),
  });

  // Make LLM call
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

  emitter.complete({
    message: 'Bool verblet complete',
    ...extractResultValue(response, interpreted),
  });

  return interpreted;
};
