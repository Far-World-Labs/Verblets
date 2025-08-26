/**
 * Lifecycle Logger
 *
 * Provides extensible logging with lifecycle methods for tracking
 * operation flow with namespaces and timing.
 */

// No-op logger for when no logger is provided
const noopLogger = {
  info: () => {},
  debug: () => {},
  trace: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Create an extended logger with lifecycle tracking
 *
 * @param {Object} baseLogger - Base logger to extend (winston, pino, roarr, etc)
 * @param {string} namespace - Namespace for log events (e.g. 'bool', 'map', 'filter')
 * @returns {Object} Extended logger with lifecycle methods
 */
export const createLifecycleLogger = (baseLogger, namespace) => {
  const logger = baseLogger ?? noopLogger;
  const startTime = Date.now();
  const getElapsed = () => Date.now() - startTime;

  return {
    // Preserve all base logger methods
    ...logger,

    // Track start time for elapsed calculations
    startTime,
    getElapsed,

    // Lifecycle: Operation start with input
    logStart: (input) => {
      logger.info({
        event: `${namespace}:input`,
        value: input,
        type: typeof input,
        length:
          typeof input === 'string'
            ? input.length
            : Array.isArray(input)
            ? input.length
            : undefined,
        timestamp: new Date().toISOString(),
      });

      logger.info({
        event: `${namespace}:start`,
        timestamp: new Date().toISOString(),
      });
    },

    // Lifecycle: Prompt/configuration construction
    logConstruction: (config, metadata = {}) => {
      logger.debug({
        event: `${namespace}:construction`,
        ...metadata,
        elapsed: getElapsed(),
      });
    },

    // Lifecycle: Processing/transformation
    logProcessing: (stage, data, metadata = {}) => {
      logger.debug({
        event: `${namespace}:${stage}`,
        ...metadata,
        elapsed: getElapsed(),
      });
    },

    // Lifecycle: Result/output
    logResult: (result, metadata = {}) => {
      logger.info({
        event: `${namespace}:output`,
        value: result,
        type: typeof result,
        ...metadata,
        elapsed: getElapsed(),
      });

      logger.info({
        event: `${namespace}:complete`,
        totalElapsed: getElapsed(),
      });
    },

    // Lifecycle: Error
    logError: (error, metadata = {}) => {
      logger.error({
        event: `${namespace}:error`,
        error: error.message,
        stack: error.stack,
        ...metadata,
        elapsed: getElapsed(),
      });
    },

    // Generic event with namespace
    logEvent: (eventName, data = {}) => {
      logger.debug({
        event: `${namespace}:${eventName}`,
        ...data,
        elapsed: getElapsed(),
      });
    },

    // Create a child logger with sub-namespace
    child: (subNamespace) => {
      return createLifecycleLogger(logger, `${namespace}:${subNamespace}`);
    },
  };
};

/**
 * Extend any logger to support child creation
 * This allows loggers like winston, pino, roarr to work with our extension pattern
 */
export const makeExtensible = (logger) => {
  if (!logger) return noopLogger;

  return {
    ...logger,
    extend: (namespace) => createLifecycleLogger(logger, namespace),
  };
};

export default createLifecycleLogger;
