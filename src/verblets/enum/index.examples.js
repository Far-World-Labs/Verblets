import { describe, expect as vitestExpect, it as vitestIt, afterAll } from 'vitest';

import enumValue from './index.js';
import vitestAiExpect from '../../chains/expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { logSuiteEnd } from '../../chains/test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../../chains/test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../../chains/test-analysis/config.js';

//
// Setup AI test wrappers
//
const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Enum verblet' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Enum verblet' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Enum verblet' } })
  : vitestAiExpect;
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

//
// Test suite
//
afterAll(async () => {
  await suiteLogEnd('Enum verblet', extractFileContext(2));
});

const examples = [
  {
    inputs: {
      text: 'What is the top color on a traffic light',
      enum: { green: 1, yellow: 1, red: 1, purple: 1 },
    },
    want: { result: 'red' },
  },
];

describe('Enum verblet', () => {
  examples.forEach((example) => {
    it(
      example.inputs.text,
      async () => {
        const result = await enumValue(example.inputs.text, example.inputs.enum);

        if (example.want.result) {
          expect(result).toStrictEqual(example.want.result);
        }
      },
      longTestTimeout
    );
  });
});
