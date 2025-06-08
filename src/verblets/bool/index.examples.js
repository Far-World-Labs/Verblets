import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import bool from './index.js';
import { expect as llmExpect } from '../../chains/llm-expect/index.js';
import { longTestTimeout } from '../../constants/common.js';

const examples = [
  {
    inputs: { text: 'Does Mace Windu have a blue lightsaber?' },
    want: { result: false },
  },
  {
    inputs: { text: 'Does Mace Windu have a purple lightsaber?' },
    want: { result: true },
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
  });

  examples.forEach((example) => {
    it(
      `${example.inputs.text}`,
      async () => {
        const result = await bool(example.inputs.text);
        expect(result).toStrictEqual(example.want.result);

        // Additional LLM assertion to validate the boolean result makes sense
        const [resultMakesSense] = await llmExpect(
          { question: example.inputs.text, answer: result },
          undefined,
          'Is this a reasonable yes/no answer to a Star Wars question?'
        );
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
      const [decisionIsReasonable] = await llmExpect(
        `The question was about Friday afternoon deployment with passing tests. The decision was: ${result}`,
        undefined,
        'Does this sound like a reasonable deployment decision?'
      );
      expect(decisionIsReasonable).toBe(true);

      // Additional assertion about the decision being conservative
      const [isConservativeDecision] = await llmExpect(
        `A boolean decision of ${result} for Friday afternoon deployment`,
        undefined,
        'Is this a cautious approach to deployment timing?'
      );
      expect(isConservativeDecision).toBe(true);
    },
    longTestTimeout
  );
});
