import { describe, expect, it } from 'vitest';

import stripResponse from './index.js';

describe('stripResponse', () => {
  it('returns a plain string unchanged', () => {
    expect(stripResponse('hello world')).toBe('hello world');
  });

  it('removes "Answer:" prefix', () => {
    expect(stripResponse('Answer: Paris')).toBe('Paris');
  });

  it('removes "answer:" prefix (lowercase)', () => {
    expect(stripResponse('answer: yes')).toBe('yes');
  });

  it('strips trailing punctuation', () => {
    expect(stripResponse('Paris.')).toBe('Paris');
    expect(stripResponse('Paris,')).toBe('Paris');
  });

  it('strips surrounding single quotes', () => {
    expect(stripResponse("'hello'")).toBe('hello');
  });

  it('strips surrounding double quotes', () => {
    expect(stripResponse('"hello"')).toBe('hello');
  });

  it('returns JSON objects as-is when they start the string', () => {
    const json = '{"key": "value"}';
    expect(stripResponse(json)).toBe(json);
  });

  it('returns JSON arrays as-is when they start the string', () => {
    const json = '["a", "b"]';
    expect(stripResponse(json)).toBe(json);
  });

  it('extracts answer section after separator and strips "answer" key prefix', () => {
    // The regex also strips "answer:" from JSON keys — this is a known behavior
    const input = 'Some question\n===========\n{"answer": true}';
    expect(stripResponse(input)).toBe('{"": true}');
  });

  it('extracts embedded JSON from surrounding text', () => {
    const input = 'The answer is {"key": "value"} as shown';
    const result = stripResponse(input);
    expect(result).toContain('"key"');
  });

  it('handles empty string', () => {
    expect(stripResponse('')).toBe('');
  });
});
