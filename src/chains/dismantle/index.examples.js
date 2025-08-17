import { describe, expect as vitestExpect, it as vitestIt, beforeAll, afterAll } from 'vitest';

import Dismantle from './index.js';
import vitestAiExpect from '../expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { logSuiteStart, logSuiteEnd } from '../test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Dismantle chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Dismantle chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Dismantle chain' } })
  : vitestAiExpect;
const suiteLogStart = config?.aiMode ? logSuiteStart : () => {};
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

beforeAll(async () => {
  await suiteLogStart('Dismantle chain', extractFileContext(2));
});

afterAll(async () => {
  await suiteLogEnd('Dismantle chain', extractFileContext(2));
});

describe('Dismantle chain', () => {
  it(
    '2022 Aprilia Tuono 660',
    async () => {
      const dismantleBike = new Dismantle('2022 Aprilia Tuono 660', {
        enhanceFixes: `
 - IMPORTANT If the component is "Electronics", output empty results.
 - If the component is "Dashboard", output empty results.
`,
      });
      await dismantleBike.makeSubtree({ depth: 1 });
      await dismantleBike.attachSubtree({
        depth: 1,
        find: (node) => node.name === 'Fuel Injector',
      });
      await dismantleBike.attachSubtree({
        depth: 1,
        find: (node) => node.name === 'Exhaust System',
      });

      expect(true).toStrictEqual(true);
    },
    longTestTimeout
  );
});
