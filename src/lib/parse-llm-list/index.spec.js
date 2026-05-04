import { expect } from 'vitest';
import parseLLMList from './index.js';
import { runTable } from '../examples-runner/index.js';

runTable({
  describe: 'parseLLMList',
  examples: [
    {
      name: 'JSON array format',
      inputs: { input: '["term1", "term2", "term3"]' },
      want: { value: ['term1', 'term2', 'term3'] },
    },
    {
      name: 'CSV format',
      inputs: { input: 'term1, term2, term3' },
      want: { value: ['term1', 'term2', 'term3'] },
    },
    { name: 'empty array response', inputs: { input: '[]' }, want: { value: [] } },
    {
      name: 'note-only response',
      inputs: { input: '<note>No terms found</note>' },
      want: { value: [] },
    },
    {
      name: 'filters default-excluded values (none, null)',
      inputs: { input: 'term1, none, term2, null, term3' },
      want: { value: ['term1', 'term2', 'term3'] },
    },
    {
      name: 'trims whitespace',
      inputs: { input: '  term1  ,  term2  ,  term3  ' },
      want: { value: ['term1', 'term2', 'term3'] },
    },
    {
      name: 'filters empty strings',
      inputs: { input: 'term1, , term2, , term3' },
      want: { value: ['term1', 'term2', 'term3'] },
    },
    {
      name: 'honours custom excludeValues',
      inputs: {
        input: 'term1, n/a, term2, unknown, term3',
        options: { excludeValues: ['n/a', 'unknown'] },
      },
      want: { value: ['term1', 'term2', 'term3'] },
    },
    { name: 'null → empty array', inputs: { input: null }, want: { value: [] } },
    { name: 'undefined → empty array', inputs: { input: undefined }, want: { value: [] } },
    { name: 'empty string → empty array', inputs: { input: '' }, want: { value: [] } },
    { name: 'non-string → empty array', inputs: { input: 123 }, want: { value: [] } },
  ],
  process: ({ inputs }) => parseLLMList(inputs.input, inputs.options),
  expects: ({ result, want }) => expect(result).toEqual(want.value),
});
