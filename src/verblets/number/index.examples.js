import { describe, expect, it } from 'vitest';

import number from './index.js';
import { expect as llmExpect } from '../llm-expect/index.js';
import { longTestTimeout } from '../../constants/common.js';

const examples = [
  {
    inputs: { text: 'What is the height of Everest in feet' },
    want: { resultRange: [29029, 29033] },
  },
  {
    inputs: { text: 'What is the length of the Nile in km' },
    want: { result: 6650 },
  },
  {
    inputs: { text: 'What is the my age in years' },
    want: { result: undefined },
  },
];

describe('Number verblet', () => {
  examples.forEach((example) => {
    it(
      example.inputs.text,
      async () => {
        const result = await number(example.inputs.text);

        if (example.want.resultRange) {
          expect(result).toBeGreaterThanOrEqual(example.want.resultRange[0]);
          expect(result).toBeLessThanOrEqual(example.want.resultRange[1]);

          // LLM assertion for range validation
          const [isReasonableValue] = await llmExpect(
            { question: example.inputs.text, answer: result },
            'Is this numeric answer reasonable and accurate for the geographic question asked?'
          );
          expect(isReasonableValue).toBe(true);
        } else {
          expect(result).toStrictEqual(example.want.result);

          // LLM assertion for undefined results
          if (example.want.result === undefined) {
            const [shouldBeUndefined] = await llmExpect(
              example.inputs.text,
              'Does this question lack sufficient context to provide a specific numeric answer?'
            );
            expect(shouldBeUndefined).toBe(true);
          }
        }
      },
      longTestTimeout
    );
  });

  it(
    'should extract numbers from recipe contexts',
    async () => {
      const recipeText =
        'Add 2 cups of flour, 3 tablespoons of sugar, and bake for 25 minutes at 350 degrees';
      const result = await number(`${recipeText} - How many minutes should I bake?`);

      expect(result).toBe(25);

      // LLM assertion to validate recipe number extraction
      const [isCorrectBakeTime] = await llmExpect(
        { recipeContext: recipeText, extractedTime: result },
        'Is the extracted baking time correct based on the recipe instructions?'
      );
      expect(isCorrectBakeTime).toBe(true);

      // Additional assertion about reasonableness
      const [isReasonableBakeTime] = await llmExpect(
        result,
        'Is this a reasonable baking time in minutes for a typical baked good?'
      );
      expect(isReasonableBakeTime).toBe(true);
    },
    longTestTimeout
  );

  it(
    'should handle financial calculations',
    async () => {
      const financialQuery =
        'If I invest $1000 at 5% annual interest, how much will I have after 10 years with compound interest?';
      const result = await number(financialQuery);

      // Should be approximately $1628.89
      expect(result).toBeGreaterThan(1600);
      expect(result).toBeLessThan(1700);

      // LLM assertion for financial calculation accuracy
      const [isReasonableReturn] = await llmExpect(
        { query: financialQuery, calculatedAmount: result },
        'Is this calculated amount reasonable for a 10-year compound interest investment at 5% annual rate?'
      );
      expect(isReasonableReturn).toBe(true);

      // Validate the calculation makes financial sense
      const [followsCompoundInterest] = await llmExpect(
        result,
        'Does this amount reflect proper compound interest growth (significantly more than simple interest would yield)?'
      );
      expect(followsCompoundInterest).toBe(true);
    },
    longTestTimeout
  );
});
