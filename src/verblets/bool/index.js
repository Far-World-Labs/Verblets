import callLlm from '../../lib/llm/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import {
  createLifecycleLogger,
  extractLLMConfig,
  extractPromptAnalysis,
  extractResultValue,
} from '../../lib/lifecycle-logger/index.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { booleanSchema } from './schema.js';

const name = 'bool';

const { asBool, asUndefinedByDefault, explainAndSeparate, explainAndSeparatePrimitive } =
  promptConstants;

export default async (text, config = {}) => {
  const { logger } = config;
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  // Create lifecycle logger with bool namespace
  const lifecycleLogger = createLifecycleLogger(logger, 'bool');

  // Log start with full input
  lifecycleLogger.logStart(text);

  const systemPrompt = `${explainAndSeparate} ${explainAndSeparatePrimitive}

${asBool} ${asUndefinedByDefault}

The value should be "true", "false", or "undefined".`;

  // Log prompt construction with extracted analysis
  lifecycleLogger.logConstruction(systemPrompt, {
    ...extractPromptAnalysis(systemPrompt),
    ...extractLLMConfig(runConfig.llm),
  });

  // Make LLM call with logger
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
      logger: lifecycleLogger,
    });

    // Interpret response
    const interpreted = response === 'true' ? true : response === 'false' ? false : undefined;

    // Log final result with raw and interpreted values
    lifecycleLogger.logResult(interpreted, extractResultValue(response, interpreted));

    emitter.complete({ outcome: 'success' });

    return interpreted;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
};
