import { describe, it, expect } from 'vitest';
import asEnum from './as-enum.js';

describe('asEnum', () => {
  it('lists enum keys as quoted options', () => {
    const result = asEnum({ positive: true, negative: true, neutral: true });
    expect(result).toBe(
      'Choose from one of the following options: "positive", "negative", "neutral".'
    );
  });

  it('handles single-key enum', () => {
    const result = asEnum({ yes: true });
    expect(result).toBe('Choose from one of the following options: "yes".');
  });

  it('uses object keys regardless of values', () => {
    const result = asEnum({ low: 0, medium: 1, high: 2 });
    expect(result).toContain('"low"');
    expect(result).toContain('"medium"');
    expect(result).toContain('"high"');
  });

  it('returns empty options for empty object', () => {
    const result = asEnum({});
    expect(result).toBe('Choose from one of the following options: .');
  });
});
