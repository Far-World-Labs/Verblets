import toDate from './index.js';
import { runTable } from '../examples-runner/index.js';

// Processor returns the parsed date as ISO (or `undefined`) so each row's
// assertion fits in a single matcher.
const examples = [
  { name: 'parses an ISO date string', inputs: '2024-03-15', want: { matches: '2024-03-15T' } },
  {
    name: 'preserves UTC hour from full ISO datetime',
    inputs: '2024-03-15T10:30:00Z',
    want: { matches: 'T10:30:00' },
  },
  {
    name: 'parses a human-readable date',
    inputs: 'March 15, 2024',
    want: { matches: '2024-03-15' },
  },
  { name: '"undefined" → undefined', inputs: 'undefined', want: undefined },
  {
    name: 'strips "Answer:" prefix',
    inputs: 'Answer: 2024-01-01',
    want: { matches: '2024-01-01' },
  },
  {
    name: 'strips surrounding quotes',
    inputs: '"2024-06-01"',
    want: { matches: '2024-06-01' },
  },
  {
    name: 'throws on invalid input',
    inputs: 'not a date at all xyz',
    want: { throws: 'LLM output [error]' },
  },
];

const process = (input) => {
  const r = toDate(input);
  return r === undefined ? undefined : r.toISOString();
};

runTable({ describe: 'toDate', examples, process });
