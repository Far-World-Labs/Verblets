import { describe, expect, it } from 'vitest';

import toNumber from './index.js';

describe('toNumber', () => {
  it('parses a plain integer', () => {
    expect(toNumber('42')).toBe(42);
  });

  it('parses a decimal number', () => {
    expect(toNumber('3.14')).toBeCloseTo(3.14);
  });

  it('parses a number with surrounding text', () => {
    expect(toNumber('The answer is 7')).toBe(7);
  });

  it('parses a number with currency symbols', () => {
    expect(toNumber('$1234')).toBe(1234);
  });

  it('returns undefined for "undefined" string', () => {
    expect(toNumber('undefined')).toBeUndefined();
  });

  it('returns NaN-derived 0 for text with no digits (stripNumeric returns empty string)', () => {
    // stripNumeric('hello') returns '', and +'' is 0
    expect(toNumber('hello')).toBe(0);
  });

  it('handles "Answer:" prefix', () => {
    expect(toNumber('Answer: 99')).toBe(99);
  });

  it('parses zero', () => {
    expect(toNumber('0')).toBe(0);
  });
});
