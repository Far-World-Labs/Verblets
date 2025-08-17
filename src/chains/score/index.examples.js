import { describe, it as vitestIt, expect as vitestExpect, beforeAll, afterAll } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import score, { reduceInstructions } from './index.js';
import reduce from '../reduce/index.js';
import { logSuiteStart, logSuiteEnd } from '../test-analysis/setup.js';
import { wrapIt, wrapExpect } from '../test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Score chain' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Score chain' } })
  : vitestExpect;
const suiteLogStart = config?.aiMode ? logSuiteStart : () => {};
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

beforeAll(async () => {
  await suiteLogStart('Score chain', extractFileContext(2));
});

afterAll(async () => {
  await suiteLogEnd('Score chain', extractFileContext(2));
});

describe('score examples', () => {
  it(
    'ranks jokes by humor',
    async () => {
      const jokes = [
        'Why did the chicken cross the road? To get to the other side!',
        "Parallel lines have so much in common. It's a shame they'll never meet.",
        "I told my computer I needed a break, and it said 'I'll go to sleep.'",
      ];

      const scores = await score(jokes, 'How funny is this joke?');

      expect(scores).toHaveLength(jokes.length);
      scores.forEach((s) => expect(typeof s).toBe('number'));
    },
    longTestTimeout
  );

  it(
    'uses score-based reduction',
    async () => {
      const products = [
        'Premium laptop with 32GB RAM',
        'Basic notebook with 4GB RAM',
        'Gaming PC with 64GB RAM',
      ];

      const bestValue = await reduce(
        products,
        await reduceInstructions({
          scoring: 'value for money considering specs',
          processing: 'find the item with the highest score',
        })
      );

      expect(bestValue).toBeDefined();
      expect(typeof bestValue).toBe('string');
    },
    longTestTimeout
  );
});
