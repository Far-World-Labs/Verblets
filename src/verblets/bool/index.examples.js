import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

import bool from './index.js';
import aiExpect from '../../chains/expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import {
  logSuiteStart,
  logTestStart,
  logTestComplete,
  logAssertion,
  logAIValidation,
} from '../../../test/setup.js';
// Create a proxy that forwards to the global logger when it's available
const logger = new Proxy(
  {},
  {
    get(target, prop) {
      const actualLogger = globalThis.testLogger;
      if (!actualLogger) {
        return () => {}; // Return no-op function
      }
      return actualLogger[prop];
    },
  }
);

const examples = [
  {
    inputs: { text: 'Does Mace Windu have a blue lightsaber?' },
    want: { result: false },
  },
  {
    inputs: { text: 'Does Mace Windu have a purple lightsaber?' },
    want: { result: true },
  },
  {
    inputs: { text: 'Is Jar Jar Binks a Sith Lord?' },
    want: { result: true }, // Intentionally wrong to simulate failure
    simulateFailure: true,
  },
];

describe('Bool verblet', () => {
  // Set environment mode to 'none' for all tests to avoid throwing
  const originalMode = process.env.LLM_EXPECT_MODE;
  let testIndex = 0;
  let currentTestStartTime;

  beforeAll(() => {
    process.env.LLM_EXPECT_MODE = 'none';
    logSuiteStart('Bool verblet', 'src/verblets/bool/index.examples.js');
  });

  beforeEach((ctx) => {
    testIndex++;
    currentTestStartTime = Date.now();
    const testName = ctx.task.name;
    const fileName = ctx.task.file?.name || 'unknown';

    logTestStart(testName, testIndex, fileName);
  });

  afterEach((ctx) => {
    const duration = Date.now() - currentTestStartTime;
    const state = ctx.task.result?.state || 'unknown';

    logTestComplete(testIndex, state, duration);
  });

  afterAll(async () => {
    if (originalMode !== undefined) {
      process.env.LLM_EXPECT_MODE = originalMode;
    } else {
      delete process.env.LLM_EXPECT_MODE;
    }

    // Create promise for analysis work that will be initiated
    let analysisResolver;
    const analysisPromise = new Promise((resolve) => {
      analysisResolver = resolve;
    });

    // Make the resolver available globally so analysis can resolve it
    globalThis.suiteAnalysisResolver = analysisResolver;

    // Log test suite completion - this will trigger the analysis
    await logger.info({
      event: 'test-suite-complete',
      suite: 'Bool verblet',
    });

    // Block until analysis is complete
    await analysisPromise;
  });

  examples.forEach((example) => {
    it(
      `${example.inputs.text}`,
      async () => {
        // Log what we're testing
        logAssertion(
          testIndex,
          `Testing if bool verblet returns ${example.want.result} for "${example.inputs.text}"`,
          example.want.result,
          null,
          true
        );

        const boolStart = Date.now();
        const result = await bool(example.inputs.text);
        const boolTime = Date.now() - boolStart;

        // Log test result
        logger.info({
          event: 'test-result',
          testIndex,
          result,
          expected: example.want.result,
          passed: result === example.want.result,
          duration: boolTime,
        });

        expect(result).toStrictEqual(example.want.result);

        // Additional LLM assertion to validate the boolean result makes sense
        const aiExpectStart = Date.now();
        const resultMakesSense = await aiExpect({
          question: example.inputs.text,
          answer: result,
        }).toSatisfy('Is this a reasonable yes/no answer to a Star Wars question?');
        const aiExpectTime = Date.now() - aiExpectStart;

        // Log AI expectation result
        logger.info({
          event: 'ai-expect-result',
          testIndex,
          passed: resultMakesSense,
          duration: aiExpectTime,
        });

        expect(resultMakesSense).toBe(true);
      },
      longTestTimeout
    );
  });

  it(
    'should handle complex contextual decisions',
    async () => {
      const complexQuestion = `
      Given the context: It's Friday at 4:45 PM, we have 3 files changed (150+ lines, 20- lines), 
      all 247 tests are passing, and the deployment window closes at 5 PM.
      Should we deploy this change to production?
    `;

      // Log test context
      logAssertion(
        testIndex,
        'Testing complex contextual decision making for deployment scenario',
        'boolean result',
        null,
        true
      );

      const boolStart = Date.now();
      const result = await bool(complexQuestion);
      const boolTime = Date.now() - boolStart;

      // Log bool result
      logger.info({
        event: 'bool-result',
        testIndex,
        result,
        duration: boolTime,
      });

      // Traditional assertion
      expect(typeof result).toBe('boolean');

      // LLM assertion to validate the decision reasoning
      const reasonableStart = Date.now();
      const decisionIsReasonable = await aiExpect(
        `The question was about Friday afternoon deployment with passing tests. The decision was: ${result}`
      ).toSatisfy('Does this sound like a reasonable deployment decision?');

      logAIValidation(
        testIndex,
        'reasonable-decision',
        decisionIsReasonable,
        Date.now() - reasonableStart
      );

      expect(decisionIsReasonable).toBe(true);

      // Additional assertion about the decision being conservative
      const conservativeStart = Date.now();
      const isConservativeDecision = await aiExpect(
        `A boolean decision of ${result} for Friday afternoon deployment`
      ).toSatisfy('Is this a cautious approach to deployment timing?');

      logAIValidation(
        testIndex,
        'conservative-approach',
        isConservativeDecision,
        Date.now() - conservativeStart
      );

      expect(isConservativeDecision).toBe(true);
    },
    longTestTimeout
  );
});
