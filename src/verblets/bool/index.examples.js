import { describe } from 'vitest';

import bool from './index.js';
import { longTestTimeout } from '../../constants/common.js';

import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect, makeLogger } = getTestHelpers('Bool verblet');

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
    want: { result: false },
  },
];

describe('Bool verblet', () => {
  examples.forEach((example) => {
    it(
      `${example.inputs.text}`,
      async () => {
        const result = await bool(example.inputs.text, {
          logger: makeLogger(example.inputs.text),
        });
        expect(result).toStrictEqual(example.want.result);

        // Additional LLM assertion to validate the boolean result makes sense
        await aiExpect({
          question: example.inputs.text,
          answer: result,
        }).toSatisfy(
          'The answer is a boolean (true=yes, false=no). Is this boolean value a factually correct yes/no answer to the Star Wars question?',
          { mode: 'warn' }
        );
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

      const result = await bool(complexQuestion, {
        logger: makeLogger('should handle complex contextual decisions'),
      });

      // Traditional assertion
      expect(typeof result).toBe('boolean');

      // Both true (tests pass, ship it) and false (Friday afternoon, risky timing) are defensible.
      // Validate the LLM produced a reasoned answer, not that it picked one specific side.
      await aiExpect(
        `Question: Should we deploy on Friday at 4:45 PM with all 247 tests passing? Answer: ${result}`
      ).toSatisfy(
        'The boolean answer is a defensible yes-or-no position on Friday afternoon deployment — either "yes, tests pass so ship it" or "no, too risky before the weekend" are both reasonable'
      );
    },
    longTestTimeout
  );
});
