import stripNumeric from './index.js';
import { runTable } from '../examples-runner/index.js';

const examples = [
  { name: 'plain number string', inputs: '42', want: '42' },
  { name: 'preserves decimal points', inputs: '3.14', want: '3.14' },
  { name: 'strips currency + commas', inputs: '$1,234.56', want: '1234.56' },
  { name: 'strips "Answer:" prefix', inputs: 'Answer: 7', want: '7' },
  { name: 'strips lowercase "answer:" prefix', inputs: 'answer: 99', want: '99' },
  { name: 'extracts from surrounding text', inputs: 'The value is 42 units', want: '42' },
  { name: 'no digits → empty string', inputs: 'no numbers here', want: '' },
  // stripNumeric only keeps digits and dots — the negative sign is dropped.
  { name: 'drops negative sign', inputs: '-5', want: '5' },
];

runTable({ describe: 'stripNumeric', examples, process: (input) => stripNumeric(input) });
