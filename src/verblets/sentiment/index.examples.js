import { describe, expect as vitestExpect, it as vitestIt, afterAll } from 'vitest';
import sentiment from './index.js';
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
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'sentiment' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'sentiment' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'sentiment' } })
  : vitestAiExpect;
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

//
// Test suite
//
afterAll(async () => {
  await suiteLogEnd('sentiment', extractFileContext(2));
});

const examples = [
  { text: 'I love sunny days!', want: 'positive' },
  { text: 'This is the worst movie ever.', want: 'negative' },
];

describe('sentiment', () => {
  examples.forEach(({ text, want }) => {
    it(
      text,
      async () => {
        expect(await sentiment(text)).toBe(want);
      },
      longTestTimeout
    );
  });
});
