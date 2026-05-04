import { expect } from 'vitest';
import toDate from './index.js';
import { runTable } from '../examples-runner/index.js';

// Processor returns the parsed date as ISO (or `undefined`). Three assertion
// modes share a vocabulary: substring match (`matches`), equality (`want`),
// or thrown error (`throws`).
runTable({
  describe: 'toDate',
  examples: [
    { name: 'parses an ISO date string', inputs: { value: '2024-03-15', matches: '2024-03-15T' } },
    {
      name: 'preserves UTC hour from full ISO datetime',
      inputs: { value: '2024-03-15T10:30:00Z', matches: 'T10:30:00' },
    },
    {
      name: 'parses a human-readable date',
      inputs: { value: 'March 15, 2024', matches: '2024-03-15' },
    },
    { name: '"undefined" → undefined', inputs: { value: 'undefined', want: undefined } },
    {
      name: 'strips "Answer:" prefix',
      inputs: { value: 'Answer: 2024-01-01', matches: '2024-01-01' },
    },
    {
      name: 'strips surrounding quotes',
      inputs: { value: '"2024-06-01"', matches: '2024-06-01' },
    },
    {
      name: 'throws on invalid input',
      inputs: { value: 'not a date at all xyz', throws: 'LLM output [error]' },
    },
  ],
  process: ({ value }) => {
    const r = toDate(value);
    return r === undefined ? undefined : r.toISOString();
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toContain(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('matches' in inputs) expect(result).toContain(inputs.matches);
    if ('want' in inputs) expect(result).toEqual(inputs.want);
  },
});
