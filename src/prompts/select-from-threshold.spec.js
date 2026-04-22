import { describe, it, expect } from 'vitest';
import selectFromThreshold from './select-from-threshold.js';

describe('selectFromThreshold', () => {
  const thresholds = [
    { threshold: 0.2, degree: 'must not be' },
    { threshold: 0.4, degree: 'must be minimally' },
    { threshold: 0.6, degree: 'must be somewhat' },
    { threshold: 0.8, degree: 'must be very' },
    { threshold: 1.0, degree: 'must be extremely' },
  ];

  it('returns the degree for the first matching threshold', () => {
    expect(selectFromThreshold(0.1, thresholds)).toBe('must not be');
    expect(selectFromThreshold(0.2, thresholds)).toBe('must not be');
  });

  it('selects correct degree at each boundary', () => {
    expect(selectFromThreshold(0.0, thresholds)).toBe('must not be');
    expect(selectFromThreshold(0.3, thresholds)).toBe('must be minimally');
    expect(selectFromThreshold(0.5, thresholds)).toBe('must be somewhat');
    expect(selectFromThreshold(0.7, thresholds)).toBe('must be very');
    expect(selectFromThreshold(0.9, thresholds)).toBe('must be extremely');
  });

  it('returns last threshold degree when value exceeds all thresholds', () => {
    expect(selectFromThreshold(1.5, thresholds)).toBe('must be extremely');
  });

  it('works with single threshold', () => {
    expect(selectFromThreshold(0.5, [{ threshold: 1.0, degree: 'always' }])).toBe('always');
  });

  it('handles exact boundary values inclusively', () => {
    expect(selectFromThreshold(0.4, thresholds)).toBe('must be minimally');
    expect(selectFromThreshold(0.6, thresholds)).toBe('must be somewhat');
    expect(selectFromThreshold(1.0, thresholds)).toBe('must be extremely');
  });
});
