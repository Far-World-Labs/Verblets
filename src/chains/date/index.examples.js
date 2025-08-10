import { describe, expect as vitestExpect, it as vitestIt, beforeAll, afterAll } from 'vitest';
import date from './index.js';
import vitestAiExpect from '../../chains/expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { logSuiteEnd } from '../test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Date chain' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Date chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Date chain' } })
  : vitestAiExpect;
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

describe('date examples', () => {
  const originalMode = process.env.LLM_EXPECT_MODE;

  beforeAll(() => {
    process.env.LLM_EXPECT_MODE = 'none';
  });

  afterAll(async () => {
    await suiteLogEnd('Date chain', extractFileContext(2));
    if (originalMode !== undefined) {
      process.env.LLM_EXPECT_MODE = originalMode;
    } else {
      delete process.env.LLM_EXPECT_MODE;
    }
  });

  it(
    'gets Star Wars release date',
    async () => {
      const result = await date('When was the original Star Wars released?');
      expect(result instanceof Date).toBe(true);
      await aiExpect(`Star Wars release date: ${result.toISOString()}`).toSatisfy(
        'Is this close to the actual release date of the first Star Wars movie?'
      );
    },
    longTestTimeout
  );

  it(
    'finds specific date in 2025',
    async () => {
      const result = await date('When is the last day of Q3 in 2025?');
      expect(result instanceof Date).toBe(true);
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(8); // September
      expect(result.getUTCDate()).toBe(30);
    },
    longTestTimeout
  );
});
