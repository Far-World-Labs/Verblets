import { describe, expect as vitestExpect, it as vitestIt, beforeAll, afterAll } from 'vitest';
import find from './index.js';
import vitestAiExpect from '../expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { logSuiteStart, logSuiteEnd } from '../test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Find chain' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Find chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Find chain' } })
  : vitestAiExpect;
const suiteLogStart = config?.aiMode ? logSuiteStart : () => {};
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

beforeAll(async () => {
  await suiteLogStart('Find chain', extractFileContext(2));
});

afterAll(async () => {
  await suiteLogEnd('Find chain', extractFileContext(2));
});

describe('find examples', () => {
  it(
    'finds the best match across batches',
    async () => {
      const titles = [
        'ancient mystery',
        'space odyssey',
        'underwater adventure',
        'future tech thriller',
      ];
      const result = await find(titles, 'Which title feels most futuristic?', { chunkSize: 2 });
      expect(result).toBeDefined();
    },
    longTestTimeout
  );
});
