import { expect } from 'vitest';
import stripNumeric from './index.js';
import { runTable } from '../examples-runner/index.js';

runTable({
  describe: 'stripNumeric',
  examples: [
    { name: 'plain number string', inputs: { value: '42', want: '42' } },
    { name: 'preserves decimal points', inputs: { value: '3.14', want: '3.14' } },
    { name: 'strips currency + commas', inputs: { value: '$1,234.56', want: '1234.56' } },
    { name: 'strips "Answer:" prefix', inputs: { value: 'Answer: 7', want: '7' } },
    {
      name: 'strips lowercase "answer:" prefix',
      inputs: { value: 'answer: 99', want: '99' },
    },
    {
      name: 'extracts from surrounding text',
      inputs: { value: 'The value is 42 units', want: '42' },
    },
    { name: 'no digits → empty string', inputs: { value: 'no numbers here', want: '' } },
    // stripNumeric only keeps digits and dots — the negative sign is dropped.
    { name: 'drops negative sign', inputs: { value: '-5', want: '5' } },
  ],
  process: ({ value }) => stripNumeric(value),
  expects: ({ result, inputs }) => expect(result).toEqual(inputs.want),
});
