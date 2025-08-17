import { describe, expect as vitestExpect, it as vitestIt, beforeAll, afterAll } from 'vitest';

import bool from './index.js';
import vitestAiExpect from '../../chains/expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { logSuiteStart, logSuiteEnd } from '../../chains/test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../../chains/test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../../chains/test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Bool verblet' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Bool verblet' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Bool verblet' } })
  : vitestAiExpect;
const suiteLogStart = config?.aiMode ? logSuiteStart : () => {};
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

beforeAll(async () => {
  await suiteLogStart('Bool verblet', extractFileContext(2));
});

afterAll(async () => {
  await suiteLogEnd('Bool verblet', extractFileContext(2));
});

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
        const result = await bool(example.inputs.text);
        expect(result).toStrictEqual(example.want.result);

        // Additional LLM assertion to validate the boolean result makes sense
        await aiExpect({
          question: example.inputs.text,
          answer: result,
        }).toSatisfy('Is this a reasonable yes/no answer to a Star Wars question?');
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
      await aiExpect(
        `The question was about Friday afternoon deployment with passing tests. The decision was: ${result}`
      ).toSatisfy('Does this sound like a reasonable deployment decision?');

      // Additional assertion about the decision being conservative
      await aiExpect(`A boolean decision of ${result} for Friday afternoon deployment`).toSatisfy(
        'Is this a cautious approach to deployment timing?'
      );
    },
    longTestTimeout
  );
});
