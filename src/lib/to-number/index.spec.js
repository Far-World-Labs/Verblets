import { expect } from 'vitest';
import toNumber from './index.js';
import { runTable } from '../examples-runner/index.js';

runTable({
  describe: 'toNumber',
  examples: [
    { name: 'parses a plain integer', inputs: { value: '42' }, want: { value: 42 } },
    {
      name: 'parses a decimal number',
      inputs: { value: '3.14' },
      want: { value: 3.14 },
    },
    {
      name: 'extracts a number from surrounding text',
      inputs: { value: 'The answer is 7' },
      want: { value: 7 },
    },
    {
      name: 'strips currency symbols',
      inputs: { value: '$1234' },
      want: { value: 1234 },
    },
    {
      name: '"undefined" string → undefined',
      inputs: { value: 'undefined' },
      want: { value: undefined },
    },
    // stripNumeric('hello') returns '', and +'' is 0.
    {
      name: 'text with no digits coerces to 0',
      inputs: { value: 'hello' },
      want: { value: 0 },
    },
    {
      name: 'strips "Answer:" prefix',
      inputs: { value: 'Answer: 99' },
      want: { value: 99 },
    },
    { name: 'parses zero', inputs: { value: '0' }, want: { value: 0 } },
  ],
  process: ({ inputs }) => toNumber(inputs.value),
  expects: ({ result, want }) => expect(result).toEqual(want.value),
});
