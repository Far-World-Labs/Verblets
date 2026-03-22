import { describe } from 'vitest';
import reduce from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Reduce chain');

describe('reduce examples', () => {
  it(
    'reduces a list sequentially with simple accumulation',
    async () => {
      const items = ['one', 'two', 'three', 'four'];
      const result = await reduce(items, 'concatenate with commas');
      expect(typeof result).toBe('string');
      await aiExpect(result).toSatisfy('contains "one", "two", "three", "four" joined with commas');
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
      expect(result).toHaveProperty('sum');
      expect(result).toHaveProperty('count');
      expect(result.sum).toBe(100);
      expect(result.count).toBe(4);
    },
    longTestTimeout
  );
});
