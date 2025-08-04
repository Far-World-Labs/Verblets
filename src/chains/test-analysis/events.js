/**
 * Create log helper functions bound to a logger instance
 * Logger handles timestamps and sync/async automatically
 */
export function createLogHelpers(logger) {
  if (!logger) {
    // Return no-op functions if no logger
    const noop = () => {};
    return {
      logSuiteStart: noop,
      logTestStart: noop,
      logTestComplete: noop,
      logExpect: noop,
      logAIExpect: noop,
    };
  }

  return {
    logSuiteStart: (suiteName, filePath) => {
      logger.info({
        event: 'test-suite-start',
        suite: suiteName,
        filePath,
      });
    },

    logTestStart: (testName, testIndex, fileName, location) => {
      logger.info({
        event: 'test-start',
        testName,
        testIndex,
        fileName,
        location,
      });
    },

    logTestComplete: (testIndex, state, duration) => {
      logger.info({
        event: 'test-complete',
        testIndex,
        state,
        duration,
      });
    },

    logExpect: (testIndex, description, expected, actual, passed) => {
      logger.info({
        event: 'expect',
        testIndex,
        description,
        expected,
        actual,
        passed,
      });
    },

    logAIExpect: (testIndex, validationType, passed, duration) => {
      logger.info({
        event: 'aiExpect',
        testIndex,
        description: validationType,
        expected: true, // AI validations expect success
        actual: passed,
        passed,
        duration,
      });
    },

    logSuiteEnd: (suiteName) => {
      logger.info({
        event: 'suite-end',
        suite: suiteName,
      });
    },
  };
}
