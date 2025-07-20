import { describe, expect, it } from 'vitest';
import reduce from './index.js';
import { longTestTimeout } from '../../constants/common.js';

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
