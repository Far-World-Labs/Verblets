/**
 * Functional logger adapter for bool verblet
 * Provides structured logging with minimal overhead
 */

// No-op logger for when no logger is provided
const noopLogger = {
  info: () => {},
  debug: () => {},
  trace: () => {},
  warn: () => {},
  error: () => {},
};

// Create a logger context with timing
export const createLoggerContext = (logger) => ({
  logger: logger || noopLogger,
  startTime: Date.now(),
});

// Get elapsed time from context
export const getElapsed = (context) => (context.startTime ? Date.now() - context.startTime : 0);

// Logging functions
export const logStart = (context, input) => {
  // Log the full input prominently at the start
  context.logger.info({
    event: 'bool:input',
    full: input,
    type: typeof input,
    length: typeof input === 'string' ? input.length : 0,
    timestamp: new Date().toISOString(),
  });

  // Also log the start event
  context.logger.info({
    event: 'bool:start',
    timestamp: new Date().toISOString(),
  });

  return context;
};

export const logPromptConstruction = (context, systemPrompt, options) => {
  context.logger.debug({
    event: 'bool:prompt:construction',
    systemPromptLength: systemPrompt.length,
    hasLlmConfig: !!options.llm,
    responseFormat: options.llm?.response_format?.type || 'json_schema',
    elapsed: getElapsed(context),
  });
  return context;
};

export const logLLMCallStart = (context, modelName, promptLength) => {
  context.logger.info({
    event: 'bool:llm:start',
    model: modelName,
    promptLength,
    elapsed: getElapsed(context),
  });
  return context;
};

export const logLLMCallEnd = (context, response, duration) => {
  context.logger.info({
    event: 'bool:llm:end',
    responseType: typeof response,
    responseLength: typeof response === 'string' ? response.length : 0,
    duration,
    elapsed: getElapsed(context),
  });
  return context;
};

export const logLLMError = (context, error) => {
  context.logger.error({
    event: 'bool:llm:error',
    error: error.message,
    stack: error.stack,
    elapsed: getElapsed(context),
  });
  return context;
};

export const logInterpretation = (context, rawResponse, interpretedValue) => {
  context.logger.debug({
    event: 'bool:interpretation',
    raw: rawResponse,
    interpreted: interpretedValue,
    decision:
      interpretedValue === true ? 'true' : interpretedValue === false ? 'false' : 'undefined',
    elapsed: getElapsed(context),
  });
  return context;
};

export const logResult = (context, result) => {
  // Log the full output prominently
  context.logger.info({
    event: 'bool:output',
    full: result,
    type: typeof result,
    value: result === true ? 'true' : result === false ? 'false' : 'undefined',
    elapsed: getElapsed(context),
  });

  // Also log completion event
  context.logger.info({
    event: 'bool:complete',
    totalElapsed: getElapsed(context),
  });

  return context;
};

export const logDecisionPoint = (context, decision, decisionContext) => {
  context.logger.trace({
    event: 'bool:decision',
    decision,
    context: decisionContext,
    elapsed: getElapsed(context),
  });
  return context;
};

// Higher-order function to wrap async operations with timing
export const withTiming = async (context, eventName, operation) => {
  const startTime = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    context.logger.debug({
      event: `bool:timing:${eventName}`,
      duration,
      elapsed: getElapsed(context),
    });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    context.logger.error({
      event: `bool:timing:${eventName}:error`,
      duration,
      error: error.message,
      elapsed: getElapsed(context),
    });
    throw error;
  }
};

// Compose multiple logging operations
export const pipe =
  (...fns) =>
  (value) =>
    fns.reduce((acc, fn) => fn(acc), value);
