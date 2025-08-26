import chatGPT from '../../lib/chatgpt/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { createLifecycleLogger } from '../../lib/lifecycle-logger/index.js';
import { booleanSchema } from './schema.js';

const {
  asBool,
  asUndefinedByDefault,
  explainAndSeparate,
  explainAndSeparatePrimitive,
  asJSON,
  asWrappedValueJSON,
} = promptConstants;

export default async (text, config = {}) => {
  const { llm, logger, ...options } = config;

  // Create lifecycle logger with bool namespace
  const lifecycleLogger = createLifecycleLogger(logger, 'bool');

  // Log start with full input
  lifecycleLogger.logStart(text);

  const systemPrompt = `${explainAndSeparate} ${explainAndSeparatePrimitive}

${asBool} ${asUndefinedByDefault}

${asWrappedValueJSON} The value should be "true", "false", or "undefined".

${asJSON}`;

  // Log prompt construction
  lifecycleLogger.logConstruction(systemPrompt, {
    systemPromptLength: systemPrompt.length,
    hasLlmConfig: !!llm,
    responseFormat: llm?.response_format?.type ?? 'json_schema',
  });

  try {
    // Make LLM call with logger
    const response = await chatGPT(text, {
      modelOptions: {
        systemPrompt,
        ...llm,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'boolean_evaluation',
            schema: booleanSchema,
          },
        },
      },
      logger: lifecycleLogger,
      ...options,
    });

    // Interpret response
    const interpreted = response === 'true' ? true : response === 'false' ? false : undefined;

    // Log interpretation as a processing stage
    lifecycleLogger.logProcessing('interpretation', interpreted, {
      raw: response,
      interpreted,
      decision: interpreted === true ? 'true' : interpreted === false ? 'false' : 'undefined',
    });

    // Log final result
    lifecycleLogger.logResult(interpreted, {
      value: interpreted === true ? 'true' : interpreted === false ? 'false' : 'undefined',
    });

    return interpreted;
  } catch (error) {
    // Log error
    lifecycleLogger.logError(error);
    throw error;
  }
};
