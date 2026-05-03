import toBool from './index.js';
import { runTable } from '../examples-runner/index.js';

const examples = [
  { name: '"true" → true', inputs: 'true', want: true },
  { name: '"True" → true (case-insensitive)', inputs: 'True', want: true },
  { name: '"TRUE" → true (uppercase)', inputs: 'TRUE', want: true },
  { name: '"false" → false', inputs: 'false', want: false },
  { name: '"False" → false (case-insensitive)', inputs: 'False', want: false },
  { name: '"FALSE" → false (uppercase)', inputs: 'FALSE', want: false },
  { name: 'ambiguous string → undefined', inputs: 'maybe', want: undefined },
  { name: 'empty string → undefined', inputs: '', want: undefined },
  { name: 'strips "Answer:" prefix', inputs: 'Answer: true', want: true },
  { name: 'strips surrounding quotes', inputs: '"true"', want: true },
  { name: 'trims whitespace', inputs: '  true  ', want: true },
];

runTable({ describe: 'toBool', examples, process: (input) => toBool(input) });
