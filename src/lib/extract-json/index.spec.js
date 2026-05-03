import extractJson from './index.js';
import { runTable } from '../examples-runner/index.js';

const examples = [
  {
    name: 'parses a clean JSON object string',
    inputs: '{"name":"Alice","age":30}',
    want: { name: 'Alice', age: 30 },
  },
  { name: 'parses a clean JSON array string', inputs: '[1, 2, 3]', want: [1, 2, 3] },
  {
    name: 'extracts JSON object surrounded by prose',
    inputs:
      'Here\'s the result: {"score": 0.85, "label": "positive"} Let me know if you need more.',
    want: { score: 0.85, label: 'positive' },
  },
  {
    name: 'extracts JSON from markdown code fences',
    inputs: '```json\n{"items": ["a", "b", "c"]}\n```',
    want: { items: ['a', 'b', 'c'] },
  },
  {
    name: 'extracts JSON array from mixed text',
    inputs: 'The categories are: ["health", "finance", "legal"] as identified.',
    want: ['health', 'finance', 'legal'],
  },
  {
    name: 'handles braces inside string values',
    inputs: 'Output: {"data": {"text": "use {curly} and [square] brackets"}, "count": 1}',
    want: { data: { text: 'use {curly} and [square] brackets' }, count: 1 },
  },
  {
    name: 'handles escaped quotes inside JSON strings',
    inputs: '{"message": "He said \\"hello\\" to them"}',
    want: { message: 'He said "hello" to them' },
  },
  {
    name: 'handles nested arrays + objects with surrounding prose',
    inputs: 'Sure, here you go: {"a": [{"b": [1, 2]}, {"c": {"d": 3}}]} — done!',
    want: { a: [{ b: [1, 2] }, { c: { d: 3 } }] },
  },
  {
    name: 'prefers object over later array',
    inputs: '{"items": [1, 2]} and also [3, 4]',
    want: { items: [1, 2] },
  },
  {
    name: 'extracts array when no object is present',
    inputs: 'Results: ["alpha", "beta", "gamma"] here',
    want: ['alpha', 'beta', 'gamma'],
  },
  {
    name: 'extracts array of objects via direct parse',
    inputs: '[{"id": 1}, {"id": 2}]',
    want: [{ id: 1 }, { id: 2 }],
  },
  {
    name: 'throws when no JSON object or array is found',
    inputs: 'This is just plain text with no JSON.',
    want: { throws: 'No JSON object or array found' },
  },
  {
    name: 'throws on unterminated JSON',
    inputs: '{"open": true, "nested": {',
    want: { throws: 'Unterminated JSON' },
  },
];

runTable({ describe: 'extractJson', examples, process: (input) => extractJson(input) });
