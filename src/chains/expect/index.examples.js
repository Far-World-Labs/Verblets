import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';

import aiExpect from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Expect chain' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Expect chain' } })
  : vitestExpect;

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
  examples.forEach((example) => {
    const description = example.inputs.constraint
      ? `${JSON.stringify(example.inputs.actual).slice(0, 30)}... - ${example.inputs.constraint}`
      : `${JSON.stringify(example.inputs.actual)} === ${JSON.stringify(example.inputs.expected)}`;

    it(
      description,
      async () => {
        let result;
        if (example.inputs.expected !== undefined) {
          result = await aiExpect(example.inputs.actual).toEqual(example.inputs.expected, {
            mode: 'none',
          });
        } else if (example.inputs.constraint !== undefined) {
          result = await aiExpect(example.inputs.actual).toSatisfy(example.inputs.constraint, {
            mode: 'none',
          });
        }

        expect(result).toBe(example.want.result);
      },
      longTestTimeout
    );
  });

  it(
    'should provide detailed debugging information on failure',
    async () => {
      const result = await aiExpect('This is clearly wrong content').toSatisfy(
        'Is this a professional business email?',
        { mode: 'none' }
      );

      expect(result).toBe(false);
    },
    longTestTimeout
  );

  it(
    'should handle complex business logic validation',
    async () => {
      const businessRecommendation =
        'Increase marketing budget by 20% for next quarter to expand market reach and target demographics aged 25-45 through social media campaigns, aiming for 15% increase in engagement';

      const result = await aiExpect(businessRecommendation).toSatisfy(
        'Is this recommendation specific, actionable, and includes measurable targets?'
      );

      expect(result).toBe(true);
    },
    longTestTimeout
  );

  it(
    'should validate creative content quality',
    async () => {
      const storyOpening =
        'Once upon a time, in a land far away, there lived a brave knight who embarked on a quest to save the kingdom from an ancient curse that had plagued the realm for centuries.';

      const result = await aiExpect(storyOpening).toSatisfy(
        'Is this story opening engaging, sets up clear conflict, and follows good narrative structure?'
      );

      expect(result).toBe(true);
    },
    longTestTimeout
  );
});
