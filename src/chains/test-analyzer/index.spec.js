import { describe, it, expect } from 'vitest';
import { mapAnalysisDepth } from './index.js';

describe('mapAnalysisDepth', () => {
  it('returns defaults for undefined', () => {
    expect(mapAnalysisDepth(undefined)).toEqual({ context: 25, maxWindow: 50, maxTokens: 300 });
  });

  it('returns low preset', () => {
    expect(mapAnalysisDepth('low')).toEqual({ context: 10, maxWindow: 25, maxTokens: 150 });
  });

  it('returns high preset', () => {
    expect(mapAnalysisDepth('high')).toEqual({ context: 50, maxWindow: 100, maxTokens: 600 });
  });

  it('passes through an object', () => {
    const custom = { context: 30, maxWindow: 60, maxTokens: 400 };
    expect(mapAnalysisDepth(custom)).toBe(custom);
  });

  it('returns defaults for unknown string', () => {
    expect(mapAnalysisDepth('medium')).toEqual({ context: 25, maxWindow: 50, maxTokens: 300 });
  });
});
