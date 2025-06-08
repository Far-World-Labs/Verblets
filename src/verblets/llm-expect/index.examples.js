import { describe, expect, it } from 'vitest';

import llmExpect from './index.js';
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
        const result = await llmExpect(
          example.inputs.actual,
          example.inputs.expected,
          example.inputs.constraint,
          { throw: false } // Don't throw for test examples
        );

        expect(result).toBe(example.want.result);
      },
      longTestTimeout
    );
  });

  it(
    'should throw by default on failure',
    async () => {
      await expect(async () => {
        await llmExpect('hello', 'goodbye');
      }).rejects.toThrow('LLM assertion failed');
    },
    longTestTimeout
  );

  it(
    'should not throw when throw option is false',
    async () => {
      const result = await llmExpect('hello', 'goodbye', undefined, { throw: false });
      expect(result).toBe(false);
    },
    longTestTimeout
  );

  it(
    'should handle business logic validation',
    async () => {
      const businessRecommendation =
        'Increase marketing budget by 20% for Q4 to boost holiday sales and target demographics aged 25-45 through social media campaigns';

      const result = await llmExpect(
        businessRecommendation,
        undefined,
        'Is this recommendation specific, actionable, and includes measurable targets?',
        { throw: false }
      );

      expect(result).toBe(true);
    },
    longTestTimeout
  );
});
