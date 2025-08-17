import { describe, expect as vitestExpect, it as vitestIt, beforeAll, afterAll } from 'vitest';

import toObject from './index.js';
import chatGPT from '../../lib/chatgpt/index.js';
import vitestAiExpect from '../expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { logSuiteStart, logSuiteEnd } from '../test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'To-object chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'To-object chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'To-object chain' } })
  : vitestAiExpect;
const suiteLogStart = config?.aiMode ? logSuiteStart : () => {};
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

beforeAll(async () => {
  await suiteLogStart('To-object chain', extractFileContext(2));
});

afterAll(async () => {
  await suiteLogEnd('To-object chain', extractFileContext(2));
});

const examples = [
  {
    inputs: { text: 'Describe SpaceX Starship' },
    want: { typeOfResult: 'object' },
  },
];

describe('To object verblet', () => {
  examples.forEach((example) => {
    it(
      example.inputs.text,
      async () => {
        const chatGPTResult = await chatGPT(example.inputs.text);
        const result = await toObject(chatGPTResult);

        if (example.want.typeOfResult) {
          expect(typeof result).toStrictEqual(example.want.typeOfResult);
        }
      },
      longTestTimeout
    );
  });
});
