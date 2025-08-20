import chatGPT from '../../lib/chatgpt/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { booleanSchema } from './schema.js';
import {
  createLoggerContext,
  logStart,
  logPromptConstruction,
  logLLMCallStart,
  logLLMCallEnd,
  logLLMError,
  logInterpretation,
  logResult,
  withTiming,
} from './logger-adapter.js';

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

  // Create logger context
  const logContext = createLoggerContext(logger);

  // Log start with full input
  logStart(logContext, text);
  const systemPrompt = `${explainAndSeparate} ${explainAndSeparatePrimitive}

${asBool} ${asUndefinedByDefault}

${asWrappedValueJSON} The value should be "true", "false", or "undefined".

${asJSON}`;

  // Log prompt construction
  logPromptConstruction(logContext, systemPrompt, { llm });

  try {
    // Log LLM call start
    const modelName = llm?.modelName || 'default';
    logLLMCallStart(logContext, modelName, systemPrompt.length);

    // Make LLM call with timing
    const response = await withTiming(logContext, 'llm-call', async () => {
      const llmStartTime = Date.now();
      const result = await chatGPT(text, {
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
        ...options,
      });

      // Log LLM call end
      logLLMCallEnd(logContext, result, Date.now() - llmStartTime);
      return result;
    });

    // Interpret response
    const interpreted = response === 'true' ? true : response === 'false' ? false : undefined;

    // Log interpretation
    logInterpretation(logContext, response, interpreted);

    // Log final result with full output
    logResult(logContext, interpreted);

    return interpreted;
  } catch (error) {
    // Log error
    logLLMError(logContext, error);
    throw error;
  }
};
