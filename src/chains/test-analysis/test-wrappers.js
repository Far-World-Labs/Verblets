/**
 * Test instrumentation wrappers
 */

import { extractFileContext } from '../../lib/logger/index.js';

const getTestLineCount = (fn) => fn?.toString?.().split('\n').length ?? 0;

const isAssertionError = (error) =>
  error.name === 'AssertionError' || error.message?.includes('expected');

const logTestEvent = async (event, data, logger) => {
  //
  // Log test event to ring buffer via logger
  //
  const log = logger || globalThis.logger;
  if (!log) {
    throw new Error(`Logger not available for event: ${event}`);
  }
  const result = await log.info({ event, ...data });
  return result;
};

export const wrapIt = (it, config = {}) => {
  const { baseProps = {}, logger } = config;

  // Simple local counter for this wrapIt instance
  let testCounter = 0;
  const registeredTests = [];

  const wrapped = (name, optionsOrFn, fnOrNothing) => {
    // Handle both signatures: it(name, fn) and it(name, options, fn)
    const hasOptions = typeof optionsOrFn === 'object' && optionsOrFn !== null;
    const options = hasOptions ? optionsOrFn : undefined;
    const fn = hasOptions ? fnOrNothing : optionsOrFn;
    
    // Simple sequential index for tests in this file
    const testIndex = testCounter++;
    registeredTests.push(name);

    // Capture test definition location synchronously
    const testDefinitionStackLevel = 3; // Skip: extractFileContext, wrapIt, test file
    const testLocation = extractFileContext(testDefinitionStackLevel);

    const wrappedFn = async (...testArgs) => {
      // Use the pre-assigned index
      baseProps.currentTestIndex = testIndex;
      baseProps.testLocation = testLocation;
      const start = Date.now();

      await logTestEvent(
        'test-start',
        {
          testName: name,
          testIndex,
          suite: baseProps.suite,
          testLineCount: getTestLineCount(fn),
          ...testLocation,
        },
        logger
      );

      try {
        const result = await fn(...testArgs);
        await logTestEvent(
          'test-complete',
          {
            testName: name,
            testIndex,
            state: 'pass',
            duration: Date.now() - start,
            suite: baseProps.suite,
            ...testLocation,
          },
          logger
        );

        return result;
      } catch (error) {
        // Log assertion errors with the location captured by wrapExpect
        if (isAssertionError(error)) {
          const failureLocation = error._expectLocation || testLocation;
          await logTestEvent(
            'expect',
            {
              testIndex,
              actual: error.actual,
              expected: error.expected,
              method: error._method || 'unknown',
              passed: false,
              suite: baseProps.suite,
              error: error.message,
              ...failureLocation,
            },
            logger
          );
        }

        await logTestEvent(
          'test-complete',
          {
            testName: name,
            testIndex,
            state: 'fail',
            duration: Date.now() - start,
            suite: baseProps.suite,
            ...testLocation,
          },
          logger
        );

        throw error;
      }
    };

    // Return the wrapped test with the correct signature
    if (options) {
      return it(name, options, wrappedFn);
    } else {
      return it(name, wrappedFn);
    }
  };

  // Wrap skip methods to track skipped tests
  wrapped.skip = (name, fn, ...args) => {
    const testIndex = testCounter++;
    registeredTests.push(name);
    
    const testLocation = extractFileContext(3);

    // Fire and forget - skipped tests aren't critical to track
    logTestEvent(
      'test-skip',
      {
        testName: name,
        test: name,
        testIndex,
        suite: baseProps.suite,
        reason: 'skip',
        ...testLocation,
      },
      logger
    );

    return it.skip(name, fn, ...args);
  };

  // Wrap skipIf to track conditionally skipped tests
  wrapped.skipIf = (condition) => condition ? wrapped.skip : wrapped;

  // Copy only property
  wrapped.only = it.only;

  return wrapped;
};

const createExpectProxy = (expectation, handler) =>
  new Proxy(expectation, {
    get: (target, method) =>
      typeof target[method] !== 'function' ? target[method] : handler(target, method),
  });

export const wrapExpect =
  (expect, config = {}) =>
  (actual) => {
    const { baseProps = {}, logger } = config;
    const testIndex = baseProps.currentTestIndex ?? 0;
    const suite = baseProps.suite ?? '';
    const expectCallStackLevel = 3; // Skip: extractFileContext, wrapExpect, test file
    const expectLocation = extractFileContext(expectCallStackLevel);

    return createExpectProxy(expect(actual), (target, method) => (...args) => {
      const log = logger || globalThis.logger;
      try {
        const result = target[method](...args);
        // Log successful expectation (async but we don't await in sync context)
        if (log) {
          log.info({
            event: 'expect',
            testIndex,
            actual,
            expected: args[0],
            method,
            passed: true,
            suite,
            ...expectLocation,
          });
        }
        return result;
      } catch (error) {
        // Mark assertion errors with location for wrapIt to log
        if (isAssertionError(error)) {
          error._expectLocation = expectLocation;
          error._method = method;
        }
        throw error;
      }
    });
  };

export const wrapAiExpect =
  (aiExpect, config = {}) =>
  (actual) => {
    const { baseProps = {}, logger } = config;
    const testIndex = baseProps.currentTestIndex ?? 0;
    const suite = baseProps.suite ?? '';

    return createExpectProxy(aiExpect(actual), (target, method) => {
      const methodCallStackLevel = 4; // Skip: extractFileContext, proxy handler, method call, test file
      const methodLocation = extractFileContext(methodCallStackLevel);
      const log = logger || globalThis.logger;

      return async (...args) => {
        const start = Date.now();
        const aiExpectData = {
          event: 'ai-expect',
          testIndex,
          actual,
          expected: args[0],
          method,
          suite,
          ...methodLocation,
        };

        try {
          const result = await target[method](...args);
          await log?.info({
            ...aiExpectData,
            passed: result === true,
            duration: Date.now() - start,
          });
          return result;
        } catch (error) {
          await log?.info({
            ...aiExpectData,
            passed: false,
            duration: Date.now() - start,
          });
          throw error;
        }
      };
    });
  };
