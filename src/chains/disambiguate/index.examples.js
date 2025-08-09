import { describe, expect as vitestExpect, it as vitestIt, afterAll } from 'vitest';
import disambiguate from './index.js';
import vitestAiExpect from '../expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { logSuiteEnd } from '../test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Disambiguate chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Disambiguate chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Disambiguate chain' } })
  : vitestAiExpect;
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

afterAll(async () => {
  await suiteLogEnd('Disambiguate chain', extractFileContext(2));
});

describe('Disambiguate chain', () => {
  it(
    'contextual meaning: bank',
    async () => {
      const result = await disambiguate({
        term: 'bank',
        context: 'She waited in line at the bank to deposit her paycheck.',
      });
      expect(typeof result.meaning).toBe('string');
      expect(result.meaning.length).toBeGreaterThan(0);
    },
    longTestTimeout
  );
});
