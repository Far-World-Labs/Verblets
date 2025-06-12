import { describe, expect, it } from 'vitest';

import aiExpect from './index.js';
import { longTestTimeout } from '../../constants/common.js';

const examples = [
  {
    inputs: {
      actual: 'hello',
      expected: 'hello',
    },
    want: { result: true },
  },
  {
    inputs: {
      actual: 'hello',
      expected: 'goodbye',
    },
    want: { result: false },
  },
  {
    inputs: {
      actual: 'Hello world!',
      constraint: 'Is this a greeting?',
    },
    want: { result: true },
  },
  {
    inputs: {
      actual: 'Goodbye cruel world',
      constraint: 'Is this a greeting?',
    },
    want: { result: false },
  },
  {
    inputs: {
      actual: 'This is a well-written, professional email with proper grammar and clear intent.',
      constraint: 'Is this text professional and grammatically correct?',
    },
    want: { result: true },
  },
  {
    inputs: {
      actual: { name: 'John Doe', age: 30, city: 'New York' },
      constraint: 'Does this person data look realistic?',
    },
    want: { result: true },
  },
];

describe('LLM Expect Verblet', () => {
  examples.forEach((example) => {
    const description = example.inputs.constraint
      ? `${JSON.stringify(example.inputs.actual).slice(0, 30)}... - ${example.inputs.constraint}`
      : `${JSON.stringify(example.inputs.actual)} === ${JSON.stringify(example.inputs.expected)}`;

    it(
      description,
      async () => {
        const result =
          example.inputs.expected !== undefined
            ? await aiExpect(example.inputs.actual).toEqual(example.inputs.expected, {
                throws: false,
              })
            : await aiExpect(example.inputs.actual).toSatisfy(example.inputs.constraint, {
                throws: false,
              });

        expect(result).toBe(example.want.result);
      },
      longTestTimeout
    );
  });

  it(
    'should throw by default on failure',
    async () => {
      await expect(async () => {
        await aiExpect('hello').toEqual('goodbye');
      }).rejects.toThrow('LLM assertion failed');
    },
    longTestTimeout
  );

  it(
    'should not throw when throws option is false',
    async () => {
      const result = await aiExpect('hello').toEqual('goodbye', { throws: false });
      expect(result).toBe(false);
    },
    longTestTimeout
  );

  it(
    'should handle business logic validation',
    async () => {
      const businessRecommendation =
        'Increase marketing budget by 20% for Q4 to boost holiday sales and target demographics aged 25-45 through social media campaigns';

      const result = await aiExpect(businessRecommendation).toSatisfy(
        'Is this recommendation specific, actionable, and includes measurable targets?',
        { throws: false }
      );

      expect(result).toBe(true);
    },
    longTestTimeout
  );
});
