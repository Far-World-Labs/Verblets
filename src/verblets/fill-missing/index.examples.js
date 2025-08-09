import { describe, it as vitestIt, expect as vitestExpect, afterAll } from 'vitest';
import fillMissing from './index.js';
import templateReplace from '../../lib/template-replace/index.js';
import { longTestTimeout } from '../../constants/common.js';
import vitestAiExpect from '../../chains/expect/index.js';
import { logSuiteEnd } from '../../chains/test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../../chains/test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../../chains/test-analysis/config.js';

//
// Setup AI test wrappers
//
const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'fillMissing example' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'fillMissing example' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'fillMissing example' } })
  : vitestAiExpect;
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

//
// Test suite
//
afterAll(async () => {
  await suiteLogEnd('fillMissing example', extractFileContext(2));
});

describe('fillMissing example', () => {
  it(
    'fills high-confidence values only',
    async () => {
      const { template, variables } = await fillMissing('The ??? went to the ???.');
      const confident = Object.fromEntries(
        Object.entries(variables)
          .filter(([, v]) => v.confidence > 0.8)
          .map(([k, v]) => [k, v.candidate])
      );
      templateReplace(template, confident, '<unknown>');
    },
    longTestTimeout
  );
});
