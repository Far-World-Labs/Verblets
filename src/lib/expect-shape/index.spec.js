import { describe, expect, it } from 'vitest';
import { expectArray, expectObject, expectString, expectNumber } from './index.js';

describe('expectArray', () => {
  it('returns the value when it is an array', () => {
    const arr = [1, 2, 3];
    expect(expectArray(arr, { chain: 'c' })).toBe(arr);
  });

  it('returns empty array on success', () => {
    expect(expectArray([], { chain: 'c' })).toEqual([]);
  });

  it('throws on null', () => {
    expect(() => expectArray(null, { chain: 'my-chain' })).toThrow(
      'my-chain: expected array (got null)'
    );
  });

  it('throws on undefined', () => {
    expect(() => expectArray(undefined, { chain: 'c' })).toThrow(/got undefined/);
  });

  it('throws on object', () => {
    expect(() => expectArray({}, { chain: 'c' })).toThrow(/got object/);
  });

  it('throws on string', () => {
    expect(() => expectArray('abc', { chain: 'c' })).toThrow(/got string/);
  });

  it('uses custom expected phrase', () => {
    expect(() =>
      expectArray(null, { chain: 'find', expected: 'array of candidates from LLM' })
    ).toThrow('find: expected array of candidates from LLM (got null)');
  });
});

describe('expectObject', () => {
  it('returns the value when it is a plain object', () => {
    const obj = { a: 1 };
    expect(expectObject(obj, { chain: 'c' })).toBe(obj);
  });

  it('returns empty object on success', () => {
    expect(expectObject({}, { chain: 'c' })).toEqual({});
  });

  it('throws on null (typeof null is object, must be filtered)', () => {
    expect(() => expectObject(null, { chain: 'c' })).toThrow(/got null/);
  });

  it('throws on array (Array.isArray, must be filtered)', () => {
    expect(() => expectObject([], { chain: 'c' })).toThrow(/got array/);
  });

  it('throws on string', () => {
    expect(() => expectObject('x', { chain: 'c' })).toThrow(/got string/);
  });

  it('throws on number', () => {
    expect(() => expectObject(42, { chain: 'c' })).toThrow(/got number/);
  });

  it('throws on undefined', () => {
    expect(() => expectObject(undefined, { chain: 'c' })).toThrow(/got undefined/);
  });

  it('uses custom expected phrase', () => {
    expect(() => expectObject('x', { chain: 'tags', expected: 'vocabulary object' })).toThrow(
      'tags: expected vocabulary object (got string)'
    );
  });
});

describe('expectString', () => {
  it('returns non-empty string', () => {
    expect(expectString('hello', { chain: 'c' })).toBe('hello');
  });

  it('throws on empty string (the default rejects empty)', () => {
    expect(() => expectString('', { chain: 'c' })).toThrow(/expected non-empty string/);
  });

  it('throws on null', () => {
    expect(() => expectString(null, { chain: 'c' })).toThrow(/got null/);
  });

  it('throws on number', () => {
    expect(() => expectString(42, { chain: 'c' })).toThrow(/got number/);
  });

  it('throws on object', () => {
    expect(() => expectString({}, { chain: 'c' })).toThrow(/got object/);
  });

  it('uses custom expected phrase', () => {
    expect(() =>
      expectString(42, { chain: 'socratic', expected: 'response from ask LLM' })
    ).toThrow('socratic: expected response from ask LLM (got number)');
  });
});

describe('expectNumber', () => {
  it('returns finite numbers', () => {
    expect(expectNumber(0, { chain: 'c' })).toBe(0);
    expect(expectNumber(-3.14, { chain: 'c' })).toBe(-3.14);
    expect(expectNumber(1e10, { chain: 'c' })).toBe(1e10);
  });

  it('throws on NaN', () => {
    expect(() => expectNumber(NaN, { chain: 'c' })).toThrow(/expected finite number/);
  });

  it('throws on Infinity', () => {
    expect(() => expectNumber(Infinity, { chain: 'c' })).toThrow(/expected finite number/);
    expect(() => expectNumber(-Infinity, { chain: 'c' })).toThrow(/expected finite number/);
  });

  it('throws on null', () => {
    expect(() => expectNumber(null, { chain: 'c' })).toThrow(/got null/);
  });

  it('throws on string-that-looks-like-number', () => {
    expect(() => expectNumber('5', { chain: 'c' })).toThrow(/got string/);
  });

  it('uses custom expected phrase', () => {
    expect(() =>
      expectNumber('high', { chain: 'score', expected: 'numeric score from LLM' })
    ).toThrow('score: expected numeric score from LLM (got string)');
  });
});

describe('error format', () => {
  it('all helpers prefix the chain name', () => {
    expect(() => expectArray('x', { chain: 'A' })).toThrow(/^A: /);
    expect(() => expectObject('x', { chain: 'B' })).toThrow(/^B: /);
    expect(() => expectString(0, { chain: 'C' })).toThrow(/^C: /);
    expect(() => expectNumber('x', { chain: 'D' })).toThrow(/^D: /);
  });

  it("uses 'array' label for arrays in the (got X) suffix", () => {
    expect(() => expectObject([1, 2], { chain: 'c' })).toThrow(/got array/);
  });

  it("uses 'null' label for null", () => {
    expect(() => expectArray(null, { chain: 'c' })).toThrow(/got null/);
  });
});
