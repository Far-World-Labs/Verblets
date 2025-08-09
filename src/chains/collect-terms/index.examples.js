import { describe, expect as vitestExpect, it as vitestIt, afterAll } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import collectTerms from './index.js';
import vitestAiExpect from '../expect/index.js';
import { logSuiteEnd } from '../test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'CollectTerms chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'CollectTerms chain' } })
  : vitestExpect;
// eslint-disable-next-line no-unused-vars
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'CollectTerms chain' } })
  : vitestAiExpect;
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

afterAll(async () => {
  await suiteLogEnd('CollectTerms chain', extractFileContext(2));
});

const sample = `Quantum entanglement and the observer effect are central to modern physics. Understanding Heisenberg's uncertainty principle alongside quantum decoherence helps explain particle behavior at subatomic scales.`;

describe('collectTerms chain', () => {
  it(
    'Example',
    async () => {
      const terms = await collectTerms(sample, { topN: 5 });
      expect(Array.isArray(terms)).toBe(true);
    },
    longTestTimeout
  );
});
