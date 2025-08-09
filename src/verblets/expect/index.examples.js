import { describe, expect as vitestExpect, it as vitestIt, afterAll } from 'vitest';

import aiExpectVerblet from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import vitestAiExpect from '../../chains/expect/index.js';
import { logSuiteEnd } from '../../chains/test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../../chains/test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../../chains/test-analysis/config.js';

//
// Setup AI test wrappers
//
const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'LLM Expect Verblet' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'LLM Expect Verblet' } })
  : vitestExpect;
// Use the original aiExpect when testing aiExpect itself to avoid double logging
// The outer expect wrapper will handle the logging for these tests
const aiExpect = vitestAiExpect;
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

//
// Test suite
//
afterAll(async () => {
  await suiteLogEnd('LLM Expect Verblet', extractFileContext(2));
});

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
                mode: 'none',
              })
            : await aiExpect(example.inputs.actual).toSatisfy(example.inputs.constraint, {
                mode: 'none',
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
    'should not throw when mode is none',
    async () => {
      const result = await aiExpect('hello').toEqual('goodbye', { mode: 'none' });
      expect(result).toBe(false);
    },
    longTestTimeout
  );

  it(
    'should handle business logic validation',
    async () => {
      const businessRecommendation =
        'Increase marketing budget by 20% for next quarter to expand market reach and target demographics aged 25-45 through social media campaigns';

      const result = await aiExpect(businessRecommendation).toSatisfy(
        'Is this recommendation specific, actionable, and includes measurable targets?',
        { mode: 'none' }
      );

      expect(result).toBe(true);
    },
    longTestTimeout
  );
});
