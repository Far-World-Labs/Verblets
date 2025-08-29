import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import date from './index.js';
import vitestAiExpect from '../expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import {
  makeWrappedIt,
  makeWrappedExpect,
  makeWrappedAiExpect,
} from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const suite = 'Date chain';

const it = makeWrappedIt(vitestIt, suite, config);
const expect = makeWrappedExpect(vitestExpect, suite, config);
const aiExpect = makeWrappedAiExpect(vitestAiExpect, suite, config);

// Higher-order function to create test-specific loggers
const makeTestLogger = (testName) => {
  return config?.aiMode && globalThis.logger
    ? globalThis.logger.child({ suite, testName })
    : undefined;
};

describe('date examples', () => {
  it(
    'gets Star Wars release date',
    async () => {
      const result = await date('When was the original Star Wars released?', {
        logger: makeTestLogger('gets Star Wars release date'),
      });
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
      const result = await date('When is the last day of Q3 in 2025?', {
        logger: makeTestLogger('finds specific date in 2025'),
      });
      expect(result instanceof Date).toBe(true);
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(8); // September
      expect(result.getUTCDate()).toBe(30);
    },
    longTestTimeout
  );
});
