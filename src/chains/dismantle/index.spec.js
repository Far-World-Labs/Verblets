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
  it('returns undefined for undefined', () => {
    expect(mapVariety(undefined)).toBeUndefined();
  });

  it('returns 0.3 for low', () => {
    expect(mapVariety('low')).toBe(0.3);
  });

  it('returns 0.9 for high', () => {
    expect(mapVariety('high')).toBe(0.9);
  });

  it('passes through a number', () => {
    expect(mapVariety(0.6)).toBe(0.6);
  });
});
