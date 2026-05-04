import { expect } from 'vitest';
import toBool from './index.js';
import { runTable } from '../examples-runner/index.js';

runTable({
  describe: 'toBool',
  examples: [
    { name: '"true" → true', inputs: { value: 'true' }, want: { value: true } },
    {
      name: '"True" → true (case-insensitive)',
      inputs: { value: 'True' },
      want: { value: true },
    },
    { name: '"TRUE" → true (uppercase)', inputs: { value: 'TRUE' }, want: { value: true } },
    { name: '"false" → false', inputs: { value: 'false' }, want: { value: false } },
    {
      name: '"False" → false (case-insensitive)',
      inputs: { value: 'False' },
      want: { value: false },
    },
    {
      name: '"FALSE" → false (uppercase)',
      inputs: { value: 'FALSE' },
      want: { value: false },
    },
    {
      name: 'ambiguous string → undefined',
      inputs: { value: 'maybe' },
      want: { value: undefined },
    },
    { name: 'empty string → undefined', inputs: { value: '' }, want: { value: undefined } },
    {
      name: 'strips "Answer:" prefix',
      inputs: { value: 'Answer: true' },
      want: { value: true },
    },
    {
      name: 'strips surrounding quotes',
      inputs: { value: '"true"' },
      want: { value: true },
    },
    { name: 'trims whitespace', inputs: { value: '  true  ' }, want: { value: true } },
  ],
  process: ({ inputs }) => toBool(inputs.value),
  expects: ({ result, want }) => expect(result).toEqual(want.value),
});
