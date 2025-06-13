// Global logger service
let globalLogger = null;

/**
 * Set the global logger instance
 * @param {Object} logger - Logger instance to use globally
 */
export const setLogger = (logger) => {
  globalLogger = logger;
};

/**
 * Reset the global logger to null
 */
export const resetLogger = () => {
  globalLogger = null;
};

/**
 * Get the current global logger instance
 * @returns {Object|null} Current logger instance or null if not set
 */
export const getLogger = () => globalLogger;

// Export convenience methods that use the global logger
export const log = (...args) => globalLogger?.log(...args);
export const info = (...args) => globalLogger?.info(...args);
export const warn = (...args) => globalLogger?.warn(...args);
export const error = (...args) => globalLogger?.error(...args);
export const debug = (...args) => globalLogger?.debug(...args);
export const trace = (...args) => globalLogger?.trace(...args);
export const fatal = (...args) => globalLogger?.fatal(...args);
