import { expect } from 'vitest';
import toBool from './index.js';
import { runTable } from '../examples-runner/index.js';

runTable({
  describe: 'toBool',
  examples: [
    { name: '"true" → true', inputs: { value: 'true', want: true } },
    { name: '"True" → true (case-insensitive)', inputs: { value: 'True', want: true } },
    { name: '"TRUE" → true (uppercase)', inputs: { value: 'TRUE', want: true } },
    { name: '"false" → false', inputs: { value: 'false', want: false } },
    { name: '"False" → false (case-insensitive)', inputs: { value: 'False', want: false } },
    { name: '"FALSE" → false (uppercase)', inputs: { value: 'FALSE', want: false } },
    { name: 'ambiguous string → undefined', inputs: { value: 'maybe', want: undefined } },
    { name: 'empty string → undefined', inputs: { value: '', want: undefined } },
    { name: 'strips "Answer:" prefix', inputs: { value: 'Answer: true', want: true } },
    { name: 'strips surrounding quotes', inputs: { value: '"true"', want: true } },
    { name: 'trims whitespace', inputs: { value: '  true  ', want: true } },
  ],
  process: ({ value }) => toBool(value),
  expects: ({ result, inputs }) => expect(result).toEqual(inputs.want),
});
