import { describe, expect as vitestExpect, it as vitestIt, beforeAll, afterAll } from 'vitest';
import filter from './index.js';
import vitestAiExpect from '../../chains/expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { logSuiteStart, logSuiteEnd } from '../../chains/test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../../chains/test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../../chains/test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Filter chain' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Filter chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Filter chain' } })
  : vitestAiExpect;
const suiteLogStart = config?.aiMode ? logSuiteStart : () => {};
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

beforeAll(async () => {
  await suiteLogStart('Filter chain', extractFileContext(2));
});

afterAll(async () => {
  await suiteLogEnd('Filter chain', extractFileContext(2));
});

describe('filter examples', () => {
  it(
    'filters with listFilter',
    async () => {
      const notes = [
        'Saw a dolphin while surfing',
        'Finished laundry',
        'Dream of traveling to Iceland',
        'Paid the electricity bill',
      ];
      const dreams = await filter(notes, 'keep only lines about aspirations or dreams', {
        batchSize: 2,
      });
      expect(dreams.length).toBeGreaterThan(0);
    },
    longTestTimeout
  );
});
