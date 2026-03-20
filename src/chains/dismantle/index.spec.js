import { describe, expect, it, vi } from 'vitest';

import { dismantle, mapVariety } from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn().mockImplementation((text, _options) => {
    // When responseFormat is used, auto-unwrapping will return the value directly
    if (/subcomponents/.test(text)) {
      return ['component1', 'component2'];
    }
    if (/variants/.test(text)) {
      return [];
    }
    return [];
  }),
}));

const examples = [
  {
    name: 'Basic usage',
    inputs: { text: 'test' },
    want: { result: {} },
  },
];

describe('Dismantle chain', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const result = await dismantle(example.inputs.text);

      if (example.want.typeOfResult) {
        expect(JSON.stringify(result.tree)).toStrictEqual(JSON.stringify(example.want.result));
      }
    });
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
