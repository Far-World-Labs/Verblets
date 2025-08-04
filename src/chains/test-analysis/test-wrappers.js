/**
 * Test instrumentation wrappers
 */

let currentTestIndex = 0;
let currentSuite = '';

export const wrapIt = (it, logger, suite) => {
  currentSuite = suite;
  let index = 0;
  return (name, fn, ...args) => {
    // Capture file/line before entering async context
    const err = new Error();
    const stackLine = err.stack.split('\n')[3]; // Skip Error, wrapIt, and return lines
    let file, line;

    if (stackLine) {
      const cleaned = stackLine.trim().replace(/^at\s+/, '');
      const parts = cleaned.split(':');
      file = parts.slice(0, -2).join(':');
      line = parseInt(parts[parts.length - 2], 10);
    }

    return it(
      name,
      async (...testArgs) => {
        currentTestIndex = ++index;
        const start = Date.now();

        const actualLogger = logger || globalThis.testLogger;
        await actualLogger?.info({
          event: 'test-start',
          testName: name,
          testIndex: currentTestIndex,
          suite,
          file,
          line,
        });

        try {
          const result = await fn(...testArgs);
          await actualLogger?.info({
            event: 'test-complete',
            testIndex: currentTestIndex,
            state: 'pass',
            duration: Date.now() - start,
            suite,
          });
          return result;
        } catch (error) {
          // Log test failure with assertion details if available
          const failureInfo = {
            event: 'test-complete',
            testIndex: currentTestIndex,
            state: 'fail',
            duration: Date.now() - start,
            suite,
          };

          if (error.actual !== undefined && error.expected !== undefined) {
            await actualLogger?.info({
              event: 'expect',
              testIndex: currentTestIndex,
              actual: error.actual,
              expected: error.expected,
              passed: false,
              suite: currentSuite,
              error: error.message,
              file,
              line,
            });
          }

          await actualLogger?.info(failureInfo);
          throw error;
        }
      },
      ...args
    );
  };
};

export const wrapExpect = (expect, logger) => (actual) => {
  const expectation = expect(actual);
  const actualLogger = logger || globalThis.testLogger;

  return new Proxy(expectation, {
    get: (target, method) =>
      typeof target[method] !== 'function'
        ? target[method]
        : (...args) => {
            // Capture file/line before any async operations
            const err = new Error();
            const stackLine = err.stack.split('\n')[3]; // Skip Error, Proxy.get, and return lines
            let file, line;

            if (stackLine) {
              const cleaned = stackLine.trim().replace(/^at\s+/, '');
              const parts = cleaned.split(':');
              file = parts
                .slice(0, -2)
                .join(':')
                .replace(/\s*\(.*$/, ''); // Remove any trailing parentheses
              line = parseInt(parts[parts.length - 2], 10);
            }

            let result;
            let errorMsg;

            try {
              result = target[method](...args);
              // Log success case
              if (actualLogger) {
                actualLogger.info({
                  event: 'expect',
                  testIndex: currentTestIndex,
                  actual,
                  expected: args[0],
                  passed: true,
                  suite: currentSuite,
                  file,
                  line,
                });
              }
            } catch (error) {
              errorMsg = error.message;
              // Log failure case before throwing
              if (actualLogger) {
                // For sync expectations, we can't await so just fire and forget
                const logPromise = actualLogger.info({
                  event: 'expect',
                  testIndex: currentTestIndex,
                  actual,
                  expected: args[0],
                  passed: false,
                  suite: currentSuite,
                  file,
                  line,
                  error: errorMsg,
                });
                logPromise.catch(() => {}); // Silently ignore logging errors
                // Give logger a chance to write
                if (globalThis.testLoggerFlush) {
                  globalThis.testLoggerFlush();
                }
              }
              throw error;
            }

            return result;
          },
  });
};

export const wrapAiExpect = (aiExpect, logger) => (actual) => {
  const actualLogger = logger || globalThis.testLogger;
  return new Proxy(aiExpect(actual), {
    get: (target, method) =>
      typeof target[method] !== 'function'
        ? target[method]
        : async (...args) => {
            // Capture file/line before async operations
            const err = new Error();
            const stackLine = err.stack.split('\n')[3]; // Skip Error, Proxy.get, and return lines
            let file, line;

            if (stackLine) {
              const cleaned = stackLine.trim().replace(/^at\s+/, '');
              const parts = cleaned.split(':');
              file = parts
                .slice(0, -2)
                .join(':')
                .replace(/\s*\(.*$/, ''); // Remove any trailing parentheses
              line = parseInt(parts[parts.length - 2], 10);
            }

            const start = Date.now();
            try {
              const result = await target[method](...args);
              actualLogger?.info({
                event: 'aiExpect',
                testIndex: currentTestIndex,
                actual,
                expected: method === 'toEqual' ? args[0] : true,
                constraint: method === 'toSatisfy' ? args[0] : undefined,
                passed: result === true,
                duration: Date.now() - start,
                suite: currentSuite,
                file,
                line,
              });
              return result;
            } catch (error) {
              actualLogger?.info({
                event: 'aiExpect',
                testIndex: currentTestIndex,
                actual,
                expected: method === 'toEqual' ? args[0] : true,
                constraint: method === 'toSatisfy' ? args[0] : undefined,
                passed: false,
                duration: Date.now() - start,
                suite: currentSuite,
                file,
                line,
              });
              throw error;
            }
          },
  });
};
