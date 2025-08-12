import { describe, it as vitestIt, expect as vitestExpect, afterAll } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import filterAmbiguous from './index.js';
import { logSuiteEnd } from '../test-analysis/setup.js';
import { wrapIt, wrapExpect } from '../test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Filter ambiguous chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Filter ambiguous chain' } })
  : vitestExpect;
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

afterAll(async () => {
  await suiteLogEnd('Filter ambiguous chain', extractFileContext(2));
});

describe('filterAmbiguous examples', () => {
  it(
    'highlights unclear language',
    async () => {
      const text = `I saw her duck\nThe magician made a little girl disappear\nHe fed her dog food`;
      const result = await filterAmbiguous(text, { topN: 2 });
      expect(result.length).toBeGreaterThan(0);
      result.forEach((r) => {
        expect(r).toHaveProperty('term');
        expect(r).toHaveProperty('sentence');
        expect(typeof r.score).toBe('number');
      });
    },
    longTestTimeout
  );
});
