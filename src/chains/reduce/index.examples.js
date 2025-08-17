import { describe, expect as vitestExpect, it as vitestIt, beforeAll, afterAll } from 'vitest';
import reduce from './index.js';
import vitestAiExpect from '../expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { logSuiteStart, logSuiteEnd } from '../test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Reduce chain' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Reduce chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Reduce chain' } })
  : vitestAiExpect;
const suiteLogStart = config?.aiMode ? logSuiteStart : () => {};
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

beforeAll(async () => {
  await suiteLogStart('Reduce chain', extractFileContext(2));
});

afterAll(async () => {
  await suiteLogEnd('Reduce chain', extractFileContext(2));
});

describe('reduce examples', () => {
  it(
    'reduces a list sequentially with simple accumulation',
    async () => {
      const items = ['one', 'two', 'three', 'four'];
      const result = await reduce(items, 'concatenate with commas');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    },
    longTestTimeout
  );

  it(
    'reduces with structured output',
    async () => {
      const numbers = [10, 20, 30, 40];
      const result = await reduce(numbers, 'calculate sum and count', {
        initial: { sum: 0, count: 0 },
        responseFormat: {
          type: 'json_schema',
          json_schema: {
            name: 'accumulator',
            schema: {
              type: 'object',
              properties: {
                sum: { type: 'number' },
                count: { type: 'number' },
              },
              required: ['sum', 'count'],
            },
          },
        },
      });
      expect(result).toBeDefined();
      expect(result).toHaveProperty('sum');
      expect(result).toHaveProperty('count');
    },
    longTestTimeout
  );
});
