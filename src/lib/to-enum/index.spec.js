import { expect } from 'vitest';
import toEnum from './index.js';
import { runTable } from '../examples-runner/index.js';

const colors = { red: 'red', green: 'green', blue: 'blue' };

runTable({
  describe: 'toEnum',
  examples: [
    { name: 'matches an exact key', inputs: { value: 'red' }, want: { value: 'red' } },
    { name: 'matches uppercase', inputs: { value: 'RED' }, want: { value: 'red' } },
    {
      name: 'matches title case',
      inputs: { value: 'Green' },
      want: { value: 'green' },
    },
    {
      name: 'unrecognized → undefined',
      inputs: { value: 'purple' },
      want: { value: undefined },
    },
    {
      name: 'strips surrounding quotes',
      inputs: { value: '"blue"' },
      want: { value: 'blue' },
    },
    {
      name: 'strips trailing punctuation',
      inputs: { value: 'red.' },
      want: { value: 'red' },
    },
    {
      name: 'strips "Answer:" prefix',
      inputs: { value: 'Answer: green' },
      want: { value: 'green' },
    },
    { name: 'trims whitespace', inputs: { value: '  blue  ' }, want: { value: 'blue' } },
    { name: 'empty string → undefined', inputs: { value: '' }, want: { value: undefined } },
  ],
  process: ({ inputs }) => toEnum(inputs.value, colors),
  expects: ({ result, want }) => expect(result).toEqual(want.value),
});
