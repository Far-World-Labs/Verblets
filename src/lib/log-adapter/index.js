/**
 * Log Adapter - Wraps various logger interfaces into a standard format
 *
 * This module provides a consistent interface for integrating with different
 * logging libraries and functions. It handles various logging patterns:
 * - Logger objects with method names (log, info, warn, error, etc.)
 * - Simple log functions
 * - Fallback strategies when certain methods aren't available
 */

/**
 * Common log level names in order of preference
 */
const LOG_LEVELS = ['log', 'info', 'warn', 'error', 'debug', 'trace', 'fatal'];

/**
 * Maps log levels to their fallback methods
 */
const LEVEL_FALLBACKS = {
  fatal: ['error', 'log'],
  error: ['log'],
  warn: ['log'],
  info: ['log'],
  debug: ['log'],
  trace: ['log'],
  log: [],
};

/**
 * Attempts to call the appropriate log method on the logger
 * @param {*} logger - The logger object or function
 * @param {string} level - The log level to try (e.g., 'info', 'error')
 * @param {*} data - The data to log
 */
function callLogMethod(logger, level, data) {
  // Try specific level method first
  if (typeof logger[level] === 'function') {
    return logger[level](data);
  }

  // Try fallback methods for this level
  const fallbacks = LEVEL_FALLBACKS[level] || ['log'];
  for (const fallbackLevel of fallbacks) {
    if (typeof logger[fallbackLevel] === 'function') {
      return logger[fallbackLevel](data);
    }
  }

  // If logger is itself a function, call it directly
  if (typeof logger === 'function') {
    return logger(data);
  }

  // No suitable method found
  return undefined;
}

/**
 * Creates a no-op logger that silently discards all log messages
 * @returns {Object} Logger with all standard methods that do nothing
 */
function createNoOpLogger() {
  const noOp = () => {};
  const logger = {};

  for (const level of LOG_LEVELS) {
    logger[level] = noOp;
  }

  return logger;
}

/**
 * Creates a wrapped logger that provides a consistent interface
 * @param {*} loggerOrLogFunction - A logger object or log function
 * @returns {Object} Wrapped logger with standard methods
 */
export function createWrappedLogger(loggerOrLogFunction) {
  if (!loggerOrLogFunction) {
    return createNoOpLogger();
  }

  const wrappedLogger = {};

  for (const level of LOG_LEVELS) {
    wrappedLogger[level] = (data) => callLogMethod(loggerOrLogFunction, level, data);
  }

  return wrappedLogger;
}

/**
 * Default export for convenience
 */
export default createWrappedLogger;
