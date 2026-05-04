import { expect } from 'vitest';
import stripResponse from './index.js';
import { runTable } from '../examples-runner/index.js';

runTable({
  describe: 'stripResponse',
  examples: [
    {
      name: 'plain string passes through',
      inputs: { value: 'hello world' },
      want: { value: 'hello world' },
    },
    {
      name: 'strips "Answer:" prefix',
      inputs: { value: 'Answer: Paris' },
      want: { value: 'Paris' },
    },
    {
      name: 'strips lowercase "answer:" prefix',
      inputs: { value: 'answer: yes' },
      want: { value: 'yes' },
    },
    {
      name: 'strips trailing period',
      inputs: { value: 'Paris.' },
      want: { value: 'Paris' },
    },
    {
      name: 'strips trailing comma',
      inputs: { value: 'Paris,' },
      want: { value: 'Paris' },
    },
    {
      name: 'strips surrounding single quotes',
      inputs: { value: "'hello'" },
      want: { value: 'hello' },
    },
    {
      name: 'strips surrounding double quotes',
      inputs: { value: '"hello"' },
      want: { value: 'hello' },
    },
    {
      name: 'JSON object passes through',
      inputs: { value: '{"key": "value"}' },
      want: { value: '{"key": "value"}' },
    },
    {
      name: 'JSON array passes through',
      inputs: { value: '["a", "b"]' },
      want: { value: '["a", "b"]' },
    },
    // The regex also strips "answer:" from JSON keys — known quirk preserved.
    {
      name: 'extracts after `===` separator and strips "answer" JSON key prefix',
      inputs: { value: 'Some question\n===========\n{"answer": true}' },
      want: { value: '{"": true}' },
    },
    {
      name: 'extracts embedded JSON from surrounding text',
      inputs: { value: 'The answer is {"key": "value"} as shown' },
      want: { contains: '"key"' },
    },
    { name: 'empty string passes through', inputs: { value: '' }, want: { value: '' } },
  ],
  process: ({ inputs }) => stripResponse(inputs.value),
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    if ('contains' in want) expect(result).toContain(want.contains);
  },
});
