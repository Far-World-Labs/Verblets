import { describe, expect as vitestExpect, it as vitestIt, beforeAll, afterAll } from 'vitest';

import bool from './index.js';
import vitestAiExpect from '../../chains/expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { logSuiteEnd } from '../../chains/test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../../chains/test-analysis/test-wrappers.js';

// Use wrappers as drop-in replacements
const it = wrapIt(vitestIt, globalThis.testLogger, 'Bool verblet');
const expect = wrapExpect(vitestExpect, globalThis.testLogger);
const aiExpect = wrapAiExpect(vitestAiExpect, globalThis.testLogger);

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
    want: { result: true }, // Intentionally wrong to test AI analysis
  },
];

describe('Bool verblet', () => {
  // Set environment mode to 'none' for all tests to avoid throwing
  const originalMode = process.env.LLM_EXPECT_MODE;

  beforeAll(() => {
    process.env.LLM_EXPECT_MODE = 'none';
  });

  afterAll(() => {
    if (originalMode !== undefined) {
      process.env.LLM_EXPECT_MODE = originalMode;
    } else {
      delete process.env.LLM_EXPECT_MODE;
    }

    logSuiteEnd('Bool verblet');
  });

  examples.forEach((example) => {
    it(
      `${example.inputs.text}`,
      async () => {
        const result = await bool(example.inputs.text);
        expect(result).toStrictEqual(example.want.result);

        // Additional LLM assertion to validate the boolean result makes sense
        const resultMakesSense = await aiExpect({
          question: example.inputs.text,
          answer: result,
        }).toSatisfy('Is this a reasonable yes/no answer to a Star Wars question?');

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

      const result = await bool(complexQuestion);

      // Traditional assertion
      expect(typeof result).toBe('boolean');

      // LLM assertion to validate the decision reasoning
      const decisionIsReasonable = await aiExpect(
        `The question was about Friday afternoon deployment with passing tests. The decision was: ${result}`
      ).toSatisfy('Does this sound like a reasonable deployment decision?');

      expect(decisionIsReasonable).toBe(true);

      // Additional assertion about the decision being conservative
      const isConservativeDecision = await aiExpect(
        `A boolean decision of ${result} for Friday afternoon deployment`
      ).toSatisfy('Is this a cautious approach to deployment timing?');

      expect(isConservativeDecision).toBe(true);
    },
    longTestTimeout
  );
});
