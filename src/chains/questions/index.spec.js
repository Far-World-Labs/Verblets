import { describe, it, expect } from 'vitest';
import { mapExploration } from './index.js';

describe('mapExploration', () => {
  it('returns 0.5 for undefined (balanced)', () => {
    expect(mapExploration(undefined)).toBe(0.5);
  });

  it('returns 0.3 for low (depth-first)', () => {
    expect(mapExploration('low')).toBe(0.3);
  });

  it('returns 0.8 for high (breadth-first)', () => {
    expect(mapExploration('high')).toBe(0.8);
  });

  it('passes through a raw number', () => {
    expect(mapExploration(0.6)).toBe(0.6);
  });

  it('returns default for unknown string', () => {
    expect(mapExploration('medium')).toBe(0.5);
  });
});
