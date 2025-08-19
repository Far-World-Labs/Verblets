import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';

import number from './index.js';
import vitestAiExpect from '../../chains/expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../../chains/test-analysis/test-wrappers.js';
import { getConfig } from '../../chains/test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Number verblet' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Number verblet' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Number verblet' } })
  : vitestAiExpect;

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

          // LLM assertion for range validation
          await aiExpect(`Question: "${example.inputs.text}" Answer: ${result}`).toSatisfy(
            'Is this a reasonable numeric answer for a geographic question?'
          );
        } else if (example.want.result !== undefined) {
          expect(result).toStrictEqual(example.want.result);
        } else {
          expect(result).toStrictEqual(example.want.result);

          // LLM assertion for undefined results
          if (example.want.result === undefined) {
            await aiExpect(`Question: "${example.inputs.text}"`).toSatisfy(
              'Does this question lack enough context to give a specific number?'
            );
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
        'What temperature should I bake the cookies at? They need to be baked for 12 minutes until golden brown';
      const result = await number(recipeText);

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);

      // LLM assertion to validate recipe number extraction
      await aiExpect(`Recipe: "${recipeText}" Extracted number: ${result}`).toSatisfy(
        'Is this number related to baking time or temperature?'
      );

      // LLM assertion to validate temperature unit
      await aiExpect(`Recipe text: "${recipeText}" Extracted number: ${result}`).toSatisfy(
        'Is this number likely a temperature in Fahrenheit (e.g. 350°F)?'
      );

      // Additional assertion about reasonableness
      await aiExpect(`Extracted number: ${result} from a baking recipe`).toSatisfy(
        'Is this a reasonable number for cooking?'
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

      // LLM assertion for financial calculation accuracy
      await aiExpect(
        `Investment question about $1000 at 5% for 10 years. Answer: $${result}`
      ).toSatisfy('Is this a reasonable amount for a 10-year investment?');

      // Validate the calculation makes financial sense
      await aiExpect(`Starting with $1000, ending with $${result} after 10 years`).toSatisfy(
        'Does this show reasonable investment growth?'
      );
    },
    longTestTimeout
  );

  it(
    'should handle financial calculations with compound interest',
    async () => {
      const result = await number(
        'If I invest $1000 at 5% annual interest for 10 years, what will be the final amount?'
      );

      expect(typeof result).toBe('number');
      // Simple interest would be 1000 + (1000 * 0.05 * 10) = 1500
      expect(result).toBeGreaterThan(1500);

      // LLM assertion for financial calculation accuracy
      await aiExpect(`Investment: $1000 at 5% for 10 years. Final amount: $${result}`).toSatisfy(
        `Is this a reasonable final amount for compound interest over 10 years? It should be significantly more than the principal due to compound growth. Expected reasonable compound interest growth, but got: $${result}`
      );

      // LLM assertion for compound interest validation
      await aiExpect(
        `Starting with $1000 at 5% annual interest for 10 years, the final amount is $${result}`
      ).toSatisfy(
        `Does this final amount follow the expected pattern of compound interest growth? It should be more than simple interest (which would be $1500) and less than exponential growth. Expected compound interest growth pattern, but got: $${result}`
      );
    },
    longTestTimeout
  );

  it(
    'should handle financial calculations with compound interest - detailed',
    async () => {
      const result = await number(
        'If I invest $1000 at 5% annual interest for 10 years, what will be the final amount?'
      );

      expect(typeof result).toBe('number');
      // Simple interest would be 1000 + (1000 * 0.05 * 10) = 1500
      // Compound interest should be more than simple interest
      expect(result).toBeGreaterThan(1500);

      // LLM assertion for financial calculation accuracy
      await aiExpect(`Investment: $1000 at 5% for 10 years. Final amount: $${result}`).toSatisfy(
        `Is this a reasonable final amount for compound interest over 10 years? It should be significantly more than the principal due to compound growth. Expected reasonable compound interest growth, but got: $${result}`
      );

      // LLM assertion for compound interest validation
      await aiExpect(
        `Starting with $1000 at 5% annual interest for 10 years, the final amount is $${result}`
      ).toSatisfy(
        `Does this final amount follow the expected pattern of compound interest growth? It should be more than simple interest (which would be $1500) and less than exponential growth. Expected compound interest growth pattern, but got: $${result}`
      );
    },
    longTestTimeout
  );
});
