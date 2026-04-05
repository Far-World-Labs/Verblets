import { describe, expect, it } from 'vitest';

import normalizeLlm from './index.js';

describe('normalizeLlm', () => {
  it('returns undefined for null', () => {
    expect(normalizeLlm(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(normalizeLlm(undefined)).toBeUndefined();
  });

  it('converts a string to { modelName }', () => {
    expect(normalizeLlm('gpt-4.1-mini')).toEqual({ modelName: 'gpt-4.1-mini' });
  });

  it('passes through an object with modelName', () => {
    const input = { modelName: 'gpt-4.1-mini' };
    expect(normalizeLlm(input)).toBe(input);
  });

  it('passes through capability flags unchanged', () => {
    const input = { fast: true, cheap: true };
    expect(normalizeLlm(input)).toBe(input);
  });

  it('passes through mixed modelName and capabilities', () => {
    const input = { modelName: 'gpt-4.1-mini', good: true };
    expect(normalizeLlm(input)).toBe(input);
  });

  it('passes through negotiate wrapper unchanged', () => {
    const input = { negotiate: { fast: true, cheap: true } };
    expect(normalizeLlm(input)).toBe(input);
  });

  it('passes through prefer values unchanged', () => {
    const input = { fast: true, good: 'prefer' };
    expect(normalizeLlm(input)).toBe(input);
  });
});
