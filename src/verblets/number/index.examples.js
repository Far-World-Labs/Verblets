import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import number from './index.js';
import { expect as llmExpect } from '../../chains/llm-expect/index.js';
import { longTestTimeout } from '../../constants/common.js';

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
  // Set environment mode to 'none' for all tests to avoid throwing
  const originalMode = process.env.LLM_EXPECT_MODE;

  beforeAll(() => {
    process.env.LLM_EXPECT_MODE = 'none';
  });

  afterAll(() => {
    if (originalMode !== undefined) {
      process.env.LLM_EXPECT_MODE = originalMode;
    } else {
      delete process.env.LLM_EXPECT_MODE;
    }
  });

  examples.forEach((example) => {
    it(
      `${example.inputs.text}`,
      async () => {
        const result = await number(example.inputs.text);

        if (example.want.range) {
          expect(result).toBeGreaterThanOrEqual(example.want.range[0]);
          expect(result).toBeLessThanOrEqual(example.want.range[1]);

          // LLM assertion for range validation
          const [isReasonableValue] = await llmExpect(
            `Question: "${example.inputs.text}" Answer: ${result}`,
            undefined,
            'Is this a reasonable numeric answer for a geographic question?'
          );
          expect(isReasonableValue).toBe(true);
        } else if (example.want.result !== undefined) {
          expect(result).toStrictEqual(example.want.result);
        } else {
          expect(result).toStrictEqual(example.want.result);

          // LLM assertion for undefined results
          if (example.want.result === undefined) {
            const [shouldBeUndefined] = await llmExpect(
              `Question: "${example.inputs.text}"`,
              undefined,
              'Does this question lack enough context to give a specific number?'
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
      const recipeText = 'Bake the cookies at 350°F for 12 minutes until golden brown';
      const result = await number(recipeText);

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);

      // LLM assertion to validate recipe number extraction
      const [isCorrectBakeTime] = await llmExpect(
        `Recipe: "${recipeText}" Extracted number: ${result}`,
        undefined,
        'Is this number related to baking time or temperature?'
      );
      expect(isCorrectBakeTime).toBe(true);

      // Additional assertion about reasonableness
      const [isReasonableBakeTime] = await llmExpect(
        `Extracted number: ${result} from a baking recipe`,
        undefined,
        'Is this a reasonable number for cooking?'
      );
      expect(isReasonableBakeTime).toBe(true);
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

      // LLM assertion for financial calculation accuracy
      const [isReasonableReturn] = await llmExpect(
        `Investment question about $1000 at 5% for 10 years. Answer: $${result}`,
        undefined,
        'Is this a reasonable amount for a 10-year investment?'
      );
      expect(isReasonableReturn).toBe(true);

      // Validate the calculation makes financial sense
      const [followsCompoundInterest] = await llmExpect(
        `Starting with $1000, ending with $${result} after 10 years`,
        undefined,
        'Does this show reasonable investment growth?'
      );
      expect(followsCompoundInterest).toBe(true);
    },
    longTestTimeout
  );
});
