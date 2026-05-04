import { expect } from 'vitest';
import extractJson from './index.js';
import { runTable } from '../examples-runner/index.js';

runTable({
  describe: 'extractJson',
  examples: [
    {
      name: 'parses a clean JSON object string',
      inputs: { value: '{"name":"Alice","age":30}' },
      want: { value: { name: 'Alice', age: 30 } },
    },
    {
      name: 'parses a clean JSON array string',
      inputs: { value: '[1, 2, 3]' },
      want: { value: [1, 2, 3] },
    },
    {
      name: 'extracts JSON object surrounded by prose',
      inputs: {
        value:
          'Here\'s the result: {"score": 0.85, "label": "positive"} Let me know if you need more.',
      },
      want: { value: { score: 0.85, label: 'positive' } },
    },
    {
      name: 'extracts JSON from markdown code fences',
      inputs: { value: '```json\n{"items": ["a", "b", "c"]}\n```' },
      want: { value: { items: ['a', 'b', 'c'] } },
    },
    {
      name: 'extracts JSON array from mixed text',
      inputs: { value: 'The categories are: ["health", "finance", "legal"] as identified.' },
      want: { value: ['health', 'finance', 'legal'] },
    },
    {
      name: 'handles braces inside string values',
      inputs: {
        value: 'Output: {"data": {"text": "use {curly} and [square] brackets"}, "count": 1}',
      },
      want: { value: { data: { text: 'use {curly} and [square] brackets' }, count: 1 } },
    },
    {
      name: 'handles escaped quotes inside JSON strings',
      inputs: { value: '{"message": "He said \\"hello\\" to them"}' },
      want: { value: { message: 'He said "hello" to them' } },
    },
    {
      name: 'handles nested arrays + objects with surrounding prose',
      inputs: { value: 'Sure, here you go: {"a": [{"b": [1, 2]}, {"c": {"d": 3}}]} — done!' },
      want: { value: { a: [{ b: [1, 2] }, { c: { d: 3 } }] } },
    },
    {
      name: 'prefers object over later array',
      inputs: { value: '{"items": [1, 2]} and also [3, 4]' },
      want: { value: { items: [1, 2] } },
    },
    {
      name: 'extracts array when no object is present',
      inputs: { value: 'Results: ["alpha", "beta", "gamma"] here' },
      want: { value: ['alpha', 'beta', 'gamma'] },
    },
    {
      name: 'extracts array of objects via direct parse',
      inputs: { value: '[{"id": 1}, {"id": 2}]' },
      want: { value: [{ id: 1 }, { id: 2 }] },
    },
    {
      name: 'throws when no JSON object or array is found',
      inputs: { value: 'This is just plain text with no JSON.' },
      want: { throws: 'No JSON object or array found' },
    },
    {
      name: 'throws on unterminated JSON',
      inputs: { value: '{"open": true, "nested": {' },
      want: { throws: 'Unterminated JSON' },
    },
  ],
  process: ({ inputs }) => extractJson(inputs.value),
  expects: ({ result, error, want }) => {
    if ('throws' in want) {
      expect(error?.message).toContain(want.throws);
      return;
    }
    if (error) throw error;
    expect(result).toEqual(want.value);
  },
});
