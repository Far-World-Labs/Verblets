import { describe, expect as vitestExpect, it as vitestIt, beforeAll, afterAll } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import { dismantle } from './index.js';
import vitestAiExpect from '../expect/index.js';
import { logSuiteStart, logSuiteEnd } from '../test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Dismantle chain (basic)' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Dismantle chain (basic)' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Dismantle chain (basic)' } })
  : vitestAiExpect;
const suiteLogStart = config?.aiMode ? logSuiteStart : () => {};
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

beforeAll(async () => {
  await suiteLogStart('Dismantle chain (basic)', extractFileContext(2));
});

afterAll(async () => {
  await suiteLogEnd('Dismantle chain (basic)', extractFileContext(2));
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
