import { expect } from 'vitest';
import extractJson from './index.js';
import { runTable } from '../examples-runner/index.js';

runTable({
  describe: 'extractJson',
  examples: [
    {
      name: 'parses a clean JSON object string',
      inputs: { value: '{"name":"Alice","age":30}', want: { name: 'Alice', age: 30 } },
    },
    {
      name: 'parses a clean JSON array string',
      inputs: { value: '[1, 2, 3]', want: [1, 2, 3] },
    },
    {
      name: 'extracts JSON object surrounded by prose',
      inputs: {
        value:
          'Here\'s the result: {"score": 0.85, "label": "positive"} Let me know if you need more.',
        want: { score: 0.85, label: 'positive' },
      },
    },
    {
      name: 'extracts JSON from markdown code fences',
      inputs: {
        value: '```json\n{"items": ["a", "b", "c"]}\n```',
        want: { items: ['a', 'b', 'c'] },
      },
    },
    {
      name: 'extracts JSON array from mixed text',
      inputs: {
        value: 'The categories are: ["health", "finance", "legal"] as identified.',
        want: ['health', 'finance', 'legal'],
      },
    },
    {
      name: 'handles braces inside string values',
      inputs: {
        value: 'Output: {"data": {"text": "use {curly} and [square] brackets"}, "count": 1}',
        want: { data: { text: 'use {curly} and [square] brackets' }, count: 1 },
      },
    },
    {
      name: 'handles escaped quotes inside JSON strings',
      inputs: {
        value: '{"message": "He said \\"hello\\" to them"}',
        want: { message: 'He said "hello" to them' },
      },
    },
    {
      name: 'handles nested arrays + objects with surrounding prose',
      inputs: {
        value: 'Sure, here you go: {"a": [{"b": [1, 2]}, {"c": {"d": 3}}]} — done!',
        want: { a: [{ b: [1, 2] }, { c: { d: 3 } }] },
      },
    },
    {
      name: 'prefers object over later array',
      inputs: { value: '{"items": [1, 2]} and also [3, 4]', want: { items: [1, 2] } },
    },
    {
      name: 'extracts array when no object is present',
      inputs: {
        value: 'Results: ["alpha", "beta", "gamma"] here',
        want: ['alpha', 'beta', 'gamma'],
      },
    },
    {
      name: 'extracts array of objects via direct parse',
      inputs: { value: '[{"id": 1}, {"id": 2}]', want: [{ id: 1 }, { id: 2 }] },
    },
    {
      name: 'throws when no JSON object or array is found',
      inputs: {
        value: 'This is just plain text with no JSON.',
        throws: 'No JSON object or array found',
      },
    },
    {
      name: 'throws on unterminated JSON',
      inputs: { value: '{"open": true, "nested": {', throws: 'Unterminated JSON' },
    },
  ],
  process: ({ value }) => extractJson(value),
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toContain(inputs.throws);
      return;
    }
    if (error) throw error;
    expect(result).toEqual(inputs.want);
  },
});
