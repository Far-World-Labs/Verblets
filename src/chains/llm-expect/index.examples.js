import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import { expect as llmExpect } from './index.js';
import { longTestTimeout } from '../../constants/common.js';

const examples = [
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

describe('LLM Expect Chain', () => {
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
    const description = example.inputs.constraint
      ? `${JSON.stringify(example.inputs.actual).slice(0, 30)}... - ${example.inputs.constraint}`
      : `${JSON.stringify(example.inputs.actual)} === ${JSON.stringify(example.inputs.expected)}`;

    it(
      description,
      async () => {
        const [result, details] = await llmExpect(
          example.inputs.actual,
          example.inputs.expected,
          example.inputs.constraint
        );

        expect(result).toBe(example.want.result);
        expect(details).toHaveProperty('passed', example.want.result);
        expect(details).toHaveProperty('file');
        expect(details).toHaveProperty('line');
        expect(typeof details.line).toBe('number');
      },
      longTestTimeout
    );
  });

  it(
    'should provide detailed debugging information on failure',
    async () => {
      const [result, details] = await llmExpect(
        'This is clearly wrong content',
        undefined,
        'Is this a professional business email?'
      );

      expect(result).toBe(false);
      expect(details.passed).toBe(false);
      expect(details.file).toBeDefined();
      expect(details.line).toBeGreaterThan(0);

      // In none mode, advice should be null for failures
      expect(details.advice).toBeNull();
    },
    longTestTimeout
  );

  it(
    'should handle complex business logic validation',
    async () => {
      const businessRecommendation =
        'Increase marketing budget by 20% for Q4 to boost holiday sales and target demographics aged 25-45 through social media campaigns';

      const [result, details] = await llmExpect(
        businessRecommendation,
        undefined,
        'Is this recommendation specific, actionable, and includes measurable targets?'
      );

      expect(result).toBe(true);
      expect(details.passed).toBe(true);
      expect(details.file).toBeDefined();
    },
    longTestTimeout
  );

  it(
    'should validate creative content quality',
    async () => {
      const storyOpening =
        'Once upon a time, in a land far away, there lived a brave knight who embarked on a quest to save the kingdom from an ancient curse that had plagued the realm for centuries.';

      const [result] = await llmExpect(
        storyOpening,
        undefined,
        'Is this story opening engaging, sets up clear conflict, and follows good narrative structure?'
      );

      expect(result).toBe(true);
    },
    longTestTimeout
  );
});
