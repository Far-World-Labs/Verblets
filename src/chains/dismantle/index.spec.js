import { vi, expect, describe, it } from 'vitest';
import { dismantle, mapVariety } from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/subcomponents/.test(text)) return ['component1', 'component2'];
    if (/variants/.test(text)) return [];
    return [];
  }),
}));

vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn(async (fn) => fn()) }));

runTable({
  describe: 'Dismantle chain',
  examples: [
    {
      name: 'returns a ChainTree with tree and rootName',
      inputs: { name: 'test' },
      want: { rootName: 'test', emptyTree: true },
    },
  ],
  process: ({ inputs }) => dismantle(inputs.name),
  expects: ({ result, want }) => {
    expect(result.rootName).toBe(want.rootName);
    expect(result).toHaveProperty('tree');
    if (want.emptyTree) expect(result.getTree()).toEqual({});
  },
});

runTable({
  describe: 'mapVariety',
  examples: [
    { name: 'undefined returns default', inputs: { v: undefined }, want: { value: undefined } },
    { name: 'passes through raw numbers', inputs: { v: 0.42 }, want: { value: 0.42 } },
    {
      name: 'unknown string falls back to default',
      inputs: { v: 'zzz' },
      want: { value: undefined },
    },
  ],
  process: ({ inputs }) => mapVariety(inputs.v),
  expects: ({ result, want }) => expect(result).toEqual(want.value),
});

describe('mapVariety: relational checks', () => {
  it('produces distinct values across levels', () => {
    const values = ['low', 'high'].map(mapVariety);
    expect(new Set(values).size).toBe(2);
  });

  it('low < high', () => {
    expect(mapVariety('low')).toBeLessThan(mapVariety('high'));
  });
});
