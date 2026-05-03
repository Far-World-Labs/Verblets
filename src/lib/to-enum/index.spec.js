import toEnum from './index.js';
import { runTable } from '../examples-runner/index.js';

const colors = { red: 'red', green: 'green', blue: 'blue' };

const examples = [
  { name: 'matches an exact key', inputs: 'red', want: 'red' },
  { name: 'matches uppercase', inputs: 'RED', want: 'red' },
  { name: 'matches title case', inputs: 'Green', want: 'green' },
  { name: 'unrecognized → undefined', inputs: 'purple', want: undefined },
  { name: 'strips surrounding quotes', inputs: '"blue"', want: 'blue' },
  { name: 'strips trailing punctuation', inputs: 'red.', want: 'red' },
  { name: 'strips "Answer:" prefix', inputs: 'Answer: green', want: 'green' },
  { name: 'trims whitespace', inputs: '  blue  ', want: 'blue' },
  { name: 'empty string → undefined', inputs: '', want: undefined },
];

runTable({ describe: 'toEnum', examples, process: (input) => toEnum(input, colors) });
