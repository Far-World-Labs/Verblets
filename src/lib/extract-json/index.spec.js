import { describe, it, expect } from 'vitest';
import extractJson from './index.js';

describe('extractJson', () => {
  it('parses a clean JSON object string', () => {
    const result = extractJson('{"name":"Alice","age":30}');
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('parses a clean JSON array string', () => {
    const result = extractJson('[1, 2, 3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('extracts JSON object with preamble and trailing text', () => {
    const input =
      'Here\'s the result: {"score": 0.85, "label": "positive"} Let me know if you need more.';
    const result = extractJson(input);
    expect(result).toEqual({ score: 0.85, label: 'positive' });
  });

  it('extracts JSON from markdown code fences', () => {
    const input = '```json\n{"items": ["a", "b", "c"]}\n```';
    const result = extractJson(input);
    expect(result).toEqual({ items: ['a', 'b', 'c'] });
  });

  it('extracts a JSON array from mixed text', () => {
    const input = 'The categories are: ["health", "finance", "legal"] as identified.';
    const result = extractJson(input);
    expect(result).toEqual(['health', 'finance', 'legal']);
  });

  it('handles nested objects with strings containing braces', () => {
    const input = 'Output: {"data": {"text": "use {curly} and [square] brackets"}, "count": 1}';
    const result = extractJson(input);
    expect(result).toEqual({ data: { text: 'use {curly} and [square] brackets' }, count: 1 });
  });

  it('handles escaped quotes inside JSON strings', () => {
    const input = '{"message": "He said \\"hello\\" to them"}';
    const result = extractJson(input);
    expect(result).toEqual({ message: 'He said "hello" to them' });
  });

  it('handles nested arrays and objects', () => {
    const json = '{"a": [{"b": [1, 2]}, {"c": {"d": 3}}]}';
    const input = `Sure, here you go: ${json} — done!`;
    const result = extractJson(input);
    expect(result).toEqual({ a: [{ b: [1, 2] }, { c: { d: 3 } }] });
  });

  it('throws when no JSON object or array is found', () => {
    expect(() => extractJson('This is just plain text with no JSON.')).toThrow(
      'No JSON object or array found in response'
    );
  });

  it('throws on unterminated JSON', () => {
    expect(() => extractJson('{"open": true, "nested": {')).toThrow(
      'Unterminated JSON in response'
    );
  });

  it('prefers object over array when object appears first', () => {
    const input = '{"items": [1, 2]} and also [3, 4]';
    const result = extractJson(input);
    expect(result).toEqual({ items: [1, 2] });
  });

  it('extracts array when no object is present', () => {
    const input = 'Results: ["alpha", "beta", "gamma"] here';
    const result = extractJson(input);
    expect(result).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('extracts array of objects via direct parse', () => {
    const input = '[{"id": 1}, {"id": 2}]';
    const result = extractJson(input);
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });
});
