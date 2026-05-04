import { expect } from 'vitest';
import stripResponse from './index.js';
import { runTable } from '../examples-runner/index.js';

runTable({
  describe: 'stripResponse',
  examples: [
    { name: 'plain string passes through', inputs: { value: 'hello world', want: 'hello world' } },
    { name: 'strips "Answer:" prefix', inputs: { value: 'Answer: Paris', want: 'Paris' } },
    { name: 'strips lowercase "answer:" prefix', inputs: { value: 'answer: yes', want: 'yes' } },
    { name: 'strips trailing period', inputs: { value: 'Paris.', want: 'Paris' } },
    { name: 'strips trailing comma', inputs: { value: 'Paris,', want: 'Paris' } },
    { name: 'strips surrounding single quotes', inputs: { value: "'hello'", want: 'hello' } },
    { name: 'strips surrounding double quotes', inputs: { value: '"hello"', want: 'hello' } },
    {
      name: 'JSON object passes through',
      inputs: { value: '{"key": "value"}', want: '{"key": "value"}' },
    },
    { name: 'JSON array passes through', inputs: { value: '["a", "b"]', want: '["a", "b"]' } },
    // The regex also strips "answer:" from JSON keys — known quirk preserved.
    {
      name: 'extracts after `===` separator and strips "answer" JSON key prefix',
      inputs: {
        value: 'Some question\n===========\n{"answer": true}',
        want: '{"": true}',
      },
    },
    {
      name: 'extracts embedded JSON from surrounding text',
      inputs: {
        value: 'The answer is {"key": "value"} as shown',
        contains: '"key"',
      },
    },
    { name: 'empty string passes through', inputs: { value: '', want: '' } },
  ],
  process: ({ value }) => stripResponse(value),
  expects: ({ result, inputs }) => {
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('contains' in inputs) expect(result).toContain(inputs.contains);
  },
});
