import { describe, expect as vitestExpect, it as vitestIt, beforeAll, afterAll } from 'vitest';
import map from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { logSuiteStart, logSuiteEnd } from '../../chains/test-analysis/setup.js';
import { wrapIt, wrapExpect } from '../../chains/test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../../chains/test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Map chain' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Map chain' } })
  : vitestExpect;
const suiteLogStart = config?.aiMode ? logSuiteStart : () => {};
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

beforeAll(async () => {
  await suiteLogStart('Map chain', extractFileContext(2));
});

afterAll(async () => {
  await suiteLogEnd('Map chain', extractFileContext(2));
});

describe('map examples', () => {
  it(
    'maps with listMap',
    async () => {
      const animals = ['dog', 'cat', 'cow', 'sheep', 'duck'];
      const result = await map(animals, 'Return the sound each animal makes', { chunkSize: 3 });
      // e.g. result[0] === 'bark'
      //      result[2] === 'moo'
      expect(result.length).toBe(5);
    },
    longTestTimeout
  );
});
