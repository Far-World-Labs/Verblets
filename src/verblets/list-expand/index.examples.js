import { describe, expect as vitestExpect, it as vitestIt, afterAll } from 'vitest';
import listExpand from './index.js';
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
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'list-expand examples' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'list-expand examples' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'list-expand examples' } })
  : vitestAiExpect;
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

//
// Test suite
//
afterAll(async () => {
  await suiteLogEnd('list-expand examples', extractFileContext(2));
});

describe('list-expand examples', () => {
  it(
    'expands a short list of fruits',
    async () => {
      const result = await listExpand(['apple', 'banana'], 5);
      expect(result.length).toBeGreaterThanOrEqual(5);
    },
    longTestTimeout
  );
});
