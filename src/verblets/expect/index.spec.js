import { vi, expect } from 'vitest';
import aiExpect from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

const extractTag = (prompt, tag) => {
  const match = prompt.match(new RegExp(`<${tag}>\\n?([\\s\\S]*?)\\n?<\\/${tag}>`));
  return match?.[1]?.trim() ?? '';
};

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn().mockImplementation((prompt) => {
    if (prompt.includes('Does the actual value strictly equal the expected value?')) {
      return extractTag(prompt, 'actual-value') === extractTag(prompt, 'expected-value');
    }
    if (prompt.includes('Does the actual value satisfy the given constraint?')) {
      const actual = extractTag(prompt, 'actual-value');
      const constraint = extractTag(prompt, 'constraint');
      if (constraint === 'Is this a greeting?' && actual === 'Hello world!') return true;
      if (constraint === 'Is this text professional and grammatically correct?')
        return actual.includes('well-written, professional email');
      if (constraint === 'Does this person data look realistic?')
        return actual.includes('John Doe') && actual.includes('"age": 30');
      if (constraint === 'Is this recommendation specific and actionable?')
        return actual.includes('Increase marketing budget by 20%');
    }
    return false;
  }),
}));

runTable({
  describe: 'aiExpect verblet',
  examples: [
    {
      name: 'passes on exact equality',
      inputs: { actual: 'hello', op: 'toEqual', arg: 'hello' },
      want: { value: true },
    },
    {
      name: 'passes on constraint match',
      inputs: { actual: 'Hello world!', op: 'toSatisfy', arg: 'Is this a greeting?' },
      want: { value: true },
    },
    {
      name: 'fails on non-matching values',
      inputs: { actual: 'goodbye', op: 'toEqual', arg: 'hello' },
      want: { value: false },
    },
    {
      name: 'validates content quality',
      inputs: {
        actual: 'This is a well-written, professional email with proper grammar.',
        op: 'toSatisfy',
        arg: 'Is this text professional and grammatically correct?',
      },
      want: { value: true },
    },
    {
      name: 'validates data structures',
      inputs: {
        actual: { name: 'John Doe', age: 30, city: 'New York' },
        op: 'toSatisfy',
        arg: 'Does this person data look realistic?',
      },
      want: { value: true },
    },
    {
      name: 'validates business logic',
      inputs: {
        actual: 'Increase marketing budget by 20% for next quarter to expand market reach',
        op: 'toSatisfy',
        arg: 'Is this recommendation specific and actionable?',
      },
      want: { value: true },
    },
    {
      name: 'throws by default on failure',
      inputs: { actual: 'hello', op: 'toEqual', arg: 'goodbye', throwsOnFail: true },
      want: { throws: 'LLM assertion failed' },
    },
  ],
  process: async ({ inputs }) =>
    aiExpect(inputs.actual)[inputs.op](
      inputs.arg,
      inputs.throwsOnFail ? undefined : { throws: false }
    ),
  expects: ({ result, error, want }) => {
    if ('throws' in want) {
      expect(error?.message).toContain(want.throws);
      return;
    }
    if (error) throw error;
    if ('value' in want) expect(result).toEqual(want.value);
  },
});
