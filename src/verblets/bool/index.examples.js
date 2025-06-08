import { describe, expect, it } from 'vitest';

import bool from './index.js';
import { expect as llmExpect } from '../llm-expect/index.js';
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
  examples.forEach((example) => {
    it(
      `${example.inputs.text}`,
      async () => {
        const result = await bool(example.inputs.text);
        expect(result).toStrictEqual(example.want.result);

        // Additional LLM assertion to validate the boolean result makes sense
        const [resultMakesSense] = await llmExpect(
          { question: example.inputs.text, answer: result },
          'Does this boolean answer correctly respond to the Star Wars trivia question?'
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
        { context: complexQuestion, decision: result },
        'Is this deployment decision reasonable given the time constraints and risk factors?'
      );
      expect(decisionIsReasonable).toBe(true);

      // Additional assertion about the decision being conservative
      const [isConservativeDecision] = await llmExpect(
        result,
        'Does this boolean value represent a conservative/cautious decision for a Friday afternoon deployment?'
      );
      expect(isConservativeDecision).toBe(true);
    },
    longTestTimeout
  );
});
