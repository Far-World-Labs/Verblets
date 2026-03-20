import { describe, it, expect } from 'vitest';
import { mapExploration } from './index.js';

describe('mapExploration', () => {
  it('produces distinct values across levels', () => {
    const values = ['low', 'med', 'high'].map(mapExploration);
    expect(new Set(values).size).toBe(3);
  });

  it('low < med < high', () => {
    expect(mapExploration('low')).toBeLessThan(mapExploration('med'));
    expect(mapExploration('med')).toBeLessThan(mapExploration('high'));
  });

  it('undefined returns default', () => {
    expect(mapExploration(undefined)).toBeDefined();
  });

  it('passes through raw numbers', () => {
    expect(mapExploration(0.42)).toBe(0.42);
  });

  it('unknown string falls back to default', () => {
    expect(mapExploration('zzz')).toBe(mapExploration(undefined));
  });
});
