import { describe, expect, it, vi } from 'vitest';

import { dismantle, mapVariety } from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/subcomponents/.test(text)) {
      return ['component1', 'component2'];
    }
    if (/variants/.test(text)) {
      return [];
    }
    return [];
  }),
}));

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => fn()),
}));

describe('Dismantle chain', () => {
  it('returns a ChainTree with tree and rootName', async () => {
    const result = await dismantle('test');

    expect(result.rootName).toBe('test');
    expect(result).toHaveProperty('tree');
    expect(result.getTree()).toStrictEqual({});
  });
});

describe('mapVariety', () => {
  it('produces distinct values across levels', () => {
    const values = ['low', 'high'].map(mapVariety);
    expect(new Set(values).size).toBe(2);
  });

  it('low < high', () => {
    expect(mapVariety('low')).toBeLessThan(mapVariety('high'));
  });

  it('undefined returns default', () => {
    expect(mapVariety(undefined)).toBeUndefined();
  });

  it('passes through raw numbers', () => {
    expect(mapVariety(0.42)).toBe(0.42);
  });

  it('unknown string falls back to default', () => {
    expect(mapVariety('zzz')).toBe(mapVariety(undefined));
  });
});
