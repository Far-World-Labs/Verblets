import { expect } from 'vitest';
import toEnum from './index.js';
import { runTable } from '../examples-runner/index.js';

const colors = { red: 'red', green: 'green', blue: 'blue' };

runTable({
  describe: 'toEnum',
  examples: [
    { name: 'matches an exact key', inputs: { value: 'red', want: 'red' } },
    { name: 'matches uppercase', inputs: { value: 'RED', want: 'red' } },
    { name: 'matches title case', inputs: { value: 'Green', want: 'green' } },
    { name: 'unrecognized → undefined', inputs: { value: 'purple', want: undefined } },
    { name: 'strips surrounding quotes', inputs: { value: '"blue"', want: 'blue' } },
    { name: 'strips trailing punctuation', inputs: { value: 'red.', want: 'red' } },
    { name: 'strips "Answer:" prefix', inputs: { value: 'Answer: green', want: 'green' } },
    { name: 'trims whitespace', inputs: { value: '  blue  ', want: 'blue' } },
    { name: 'empty string → undefined', inputs: { value: '', want: undefined } },
  ],
  process: ({ value }) => toEnum(value, colors),
  expects: ({ result, inputs }) => expect(result).toEqual(inputs.want),
});
