import { describe, it, expect } from 'vitest';
import { mapAnalysisDepth } from './index.js';

describe('mapAnalysisDepth', () => {
  it('all levels return same shape', () => {
    const keys = ['low', 'med', 'high'].map((l) => Object.keys(mapAnalysisDepth(l)).sort());
    expect(keys[0]).toEqual(keys[1]);
    expect(keys[1]).toEqual(keys[2]);
  });

  it('undefined returns default', () => {
    expect(mapAnalysisDepth(undefined)).toBeDefined();
    expect(typeof mapAnalysisDepth(undefined)).toBe('object');
  });

  it('passes through object for power consumers', () => {
    const custom = { a: 1, b: 2 };
    expect(mapAnalysisDepth(custom)).toBe(custom);
  });

  it('unknown string falls back to default', () => {
    expect(mapAnalysisDepth('zzz')).toEqual(mapAnalysisDepth(undefined));
  });
});
