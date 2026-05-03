import toNumber from './index.js';
import { runTable } from '../examples-runner/index.js';

const examples = [
  { name: 'parses a plain integer', inputs: '42', want: 42 },
  { name: 'parses a decimal number', inputs: '3.14', want: 3.14 },
  { name: 'extracts a number from surrounding text', inputs: 'The answer is 7', want: 7 },
  { name: 'strips currency symbols', inputs: '$1234', want: 1234 },
  { name: '"undefined" string → undefined', inputs: 'undefined', want: undefined },
  // stripNumeric('hello') returns '', and +'' is 0.
  { name: 'text with no digits coerces to 0', inputs: 'hello', want: 0 },
  { name: 'strips "Answer:" prefix', inputs: 'Answer: 99', want: 99 },
  { name: 'parses zero', inputs: '0', want: 0 },
];

runTable({ describe: 'toNumber', examples, process: (input) => toNumber(input) });
