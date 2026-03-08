import { describe, expect, it } from 'vitest';

import toDate from './index.js';

describe('toDate', () => {
  it('parses an ISO date string', () => {
    const result = toDate('2024-03-15');
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toContain('2024-03-15');
  });

  it('parses a full ISO datetime', () => {
    const result = toDate('2024-03-15T10:30:00Z');
    expect(result).toBeInstanceOf(Date);
    expect(result.getUTCHours()).toBe(10);
  });

  it('parses a human-readable date', () => {
    const result = toDate('March 15, 2024');
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2024);
  });

  it('returns undefined for "undefined" string', () => {
    expect(toDate('undefined')).toBeUndefined();
  });

  it('throws for invalid date input', () => {
    expect(() => toDate('not a date at all xyz')).toThrow('LLM output [error]');
  });

  it('handles "Answer:" prefix', () => {
    const result = toDate('Answer: 2024-01-01');
    expect(result).toBeInstanceOf(Date);
  });

  it('handles surrounding quotes', () => {
    const result = toDate('"2024-06-01"');
    expect(result).toBeInstanceOf(Date);
  });
});
