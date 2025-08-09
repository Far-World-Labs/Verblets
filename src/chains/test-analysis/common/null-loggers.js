/**
 * Null logger implementations
 */

export function createNullLogger() {
  return {
    info: () => Promise.resolve(),
    infoSync: () => {},
    error: () => Promise.resolve(),
    errorSync: () => {},
    warn: () => Promise.resolve(),
    warnSync: () => {},
    debug: () => Promise.resolve(),
    debugSync: () => {},
  };
}

export function createNoOpHelpers() {
  return {
    logSuiteStart: () => {},
    logTestStart: () => {},
    logTestComplete: () => {},
    logExpect: () => {},
    logAIExpect: () => {},
    logSuiteEnd: async () => {},
  };
}
