import { expect } from 'vitest';
import toDate from './index.js';
import { runTable } from '../examples-runner/index.js';

// Processor returns the parsed date as ISO (or `undefined`). The `want` block
// declares either a substring (`contains`), an equality (`value`), or a
// thrown error (`throws`).
runTable({
  describe: 'toDate',
  examples: [
    {
      name: 'parses an ISO date string',
      inputs: { value: '2024-03-15' },
      want: { contains: '2024-03-15T' },
    },
    {
      name: 'preserves UTC hour from full ISO datetime',
      inputs: { value: '2024-03-15T10:30:00Z' },
      want: { contains: 'T10:30:00' },
    },
    {
      name: 'parses a human-readable date',
      inputs: { value: 'March 15, 2024' },
      want: { contains: '2024-03-15' },
    },
    {
      name: '"undefined" → undefined',
      inputs: { value: 'undefined' },
      want: { value: undefined },
    },
    {
      name: 'strips "Answer:" prefix',
      inputs: { value: 'Answer: 2024-01-01' },
      want: { contains: '2024-01-01' },
    },
    {
      name: 'strips surrounding quotes',
      inputs: { value: '"2024-06-01"' },
      want: { contains: '2024-06-01' },
    },
    {
      name: 'throws on invalid input',
      inputs: { value: 'not a date at all xyz' },
      want: { throws: 'LLM output [error]' },
    },
  ],
  process: ({ inputs }) => {
    const r = toDate(inputs.value);
    return r === undefined ? undefined : r.toISOString();
  },
  expects: ({ result, error, want }) => {
    if ('throws' in want) {
      expect(error?.message).toContain(want.throws);
      return;
    }
    if (error) throw error;
    if ('contains' in want) expect(result).toContain(want.contains);
    if ('value' in want) expect(result).toEqual(want.value);
  },
});
