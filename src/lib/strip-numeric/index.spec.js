import { describe, expect, it } from 'vitest';

import stripNumeric from './index.js';

describe('stripNumeric', () => {
  it('returns digits from a plain number string', () => {
    expect(stripNumeric('42')).toBe('42');
  });

  it('preserves decimal points', () => {
    expect(stripNumeric('3.14')).toBe('3.14');
  });

  it('strips non-numeric characters', () => {
    expect(stripNumeric('$1,234.56')).toBe('1234.56');
  });

  it('removes "Answer:" prefix', () => {
    expect(stripNumeric('Answer: 7')).toBe('7');
  });

  it('removes "answer:" prefix (lowercase)', () => {
    expect(stripNumeric('answer: 99')).toBe('99');
  });

  it('extracts number from surrounding text', () => {
    expect(stripNumeric('The value is 42 units')).toBe('42');
  });

  it('returns empty string when no digits present', () => {
    expect(stripNumeric('no numbers here')).toBe('');
  });

  it('handles negative sign by stripping it', () => {
    // stripNumeric only keeps digits and dots
    expect(stripNumeric('-5')).toBe('5');
  });
});
