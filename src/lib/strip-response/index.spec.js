import stripResponse from './index.js';
import { runTable } from '../examples-runner/index.js';

const examples = [
  { name: 'plain string passes through', inputs: 'hello world', want: 'hello world' },
  { name: 'strips "Answer:" prefix', inputs: 'Answer: Paris', want: 'Paris' },
  { name: 'strips lowercase "answer:" prefix', inputs: 'answer: yes', want: 'yes' },
  { name: 'strips trailing period', inputs: 'Paris.', want: 'Paris' },
  { name: 'strips trailing comma', inputs: 'Paris,', want: 'Paris' },
  { name: 'strips surrounding single quotes', inputs: "'hello'", want: 'hello' },
  { name: 'strips surrounding double quotes', inputs: '"hello"', want: 'hello' },
  { name: 'JSON object passes through', inputs: '{"key": "value"}', want: '{"key": "value"}' },
  { name: 'JSON array passes through', inputs: '["a", "b"]', want: '["a", "b"]' },
  // The regex also strips "answer:" from JSON keys — known quirk preserved.
  {
    name: 'extracts after `===` separator and strips "answer" JSON key prefix',
    inputs: 'Some question\n===========\n{"answer": true}',
    want: '{"": true}',
  },
  {
    name: 'extracts embedded JSON from surrounding text',
    inputs: 'The answer is {"key": "value"} as shown',
    want: { contains: '"key"' },
  },
  { name: 'empty string passes through', inputs: '', want: '' },
];

runTable({ describe: 'stripResponse', examples, process: (input) => stripResponse(input) });
