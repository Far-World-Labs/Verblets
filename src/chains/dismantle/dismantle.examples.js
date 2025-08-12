import { describe, expect as vitestExpect, it as vitestIt, afterAll } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import { dismantle } from './index.js';
import vitestAiExpect from '../expect/index.js';
import { logSuiteEnd } from '../test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Dismantle chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Dismantle chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Dismantle chain' } })
  : vitestAiExpect;
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

afterAll(async () => {
  await suiteLogEnd('Dismantle chain', extractFileContext(2));
});

const examples = [
  {
    name: 'Basic usage',
    inputs: { text: 'test' },
    want: { result: {} },
  },
];

describe('Dismantle chain', () => {
  examples.forEach((example) => {
    it(
      example.name,
      async () => {
        const result = await dismantle(example.inputs.text);

        if (example.want.typeOfResult) {
          expect(JSON.stringify(result.tree)).toStrictEqual(JSON.stringify(example.want.result));
        }
      },
      longTestTimeout
    );
  });
});
