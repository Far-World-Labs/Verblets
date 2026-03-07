import { describe, expect, it } from 'vitest';

import toBool from './index.js';

describe('toBool', () => {
  it('returns true for "true"', () => {
    expect(toBool('true')).toBe(true);
  });

  it('returns true for "True"', () => {
    expect(toBool('True')).toBe(true);
  });

  it('returns true for "TRUE"', () => {
    expect(toBool('TRUE')).toBe(true);
  });

  it('returns false for "false"', () => {
    expect(toBool('false')).toBe(false);
  });

  it('returns false for "False"', () => {
    expect(toBool('False')).toBe(false);
  });

  it('returns false for "FALSE"', () => {
    expect(toBool('FALSE')).toBe(false);
  });

  it('returns undefined for ambiguous input', () => {
    expect(toBool('maybe')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(toBool('')).toBeUndefined();
  });

  it('handles "Answer: true" prefix', () => {
    expect(toBool('Answer: true')).toBe(true);
  });

  it('handles surrounding quotes', () => {
    expect(toBool('"true"')).toBe(true);
  });

  it('handles whitespace', () => {
    expect(toBool('  true  ')).toBe(true);
  });
});
