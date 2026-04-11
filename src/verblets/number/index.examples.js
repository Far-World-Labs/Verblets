import { describe } from 'vitest';

import number from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Number verblet');

const examples = [
  {
    inputs: { text: 'What is the height of Everest in feet' },
    want: { range: [29000, 29100] }, // Tolerant range around 29032
  },
  {
    inputs: { text: 'What is the length of the Nile in km' },
    want: { range: [6000, 7000] }, // Tolerant range around 6650
  },
  {
    inputs: { text: 'What is the my age in years' },
    want: { result: undefined },
  },
];

describe('Number verblet', () => {
  examples.forEach((example) => {
    it(
      `${example.inputs.text}`,
      async () => {
        const result = await number(example.inputs.text);

        if (example.want.range) {
          expect(result).toBeGreaterThanOrEqual(example.want.range[0]);
          expect(result).toBeLessThanOrEqual(example.want.range[1]);
        } else {
          expect(result).toStrictEqual(example.want.result);
        }
      },
      longTestTimeout
    );
  });

  it(
    'should extract numbers from recipe contexts',
    async () => {
      const recipeText =
        'How many eggs does a standard chocolate chip cookie recipe need? A typical batch uses 2 eggs, 2.25 cups flour, and 1 cup sugar.';
      const result = await number(recipeText);

      expect(typeof result).toBe('number');
      expect(result).toBe(2);
      await aiExpect(result).toSatisfy(
        'the number of eggs in a standard chocolate chip cookie recipe'
      );
    },
    longTestTimeout
  );

  it(
    'should handle financial calculations',
    async () => {
      const financialQuery =
        'If I invest $1000 at 5% annual compound interest for 10 years, how much will I have?';
      const result = await number(financialQuery);

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(1000); // Should be more than principal
      // Compound interest: 1000 * (1.05)^10 ≈ 1628.89
      expect(result).toBeLessThan(2000);
      await aiExpect(result).toSatisfy('approximately $1628.89, the compound interest result');
    },
    longTestTimeout
  );
});
