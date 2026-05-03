import { vi, expect } from 'vitest';
import { dismantle, mapVariety } from './index.js';
import { runTable, equals, isUndefined } from '../../lib/examples-runner/index.js';

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
      check: ({ result }) => {
        expect(result.rootName).toBe('test');
        expect(result).toHaveProperty('tree');
        expect(result.getTree()).toStrictEqual({});
      },
    },
  ],
  process: ({ name }) => dismantle(name),
});

runTable({
  describe: 'mapVariety',
  examples: [
    {
      name: 'produces distinct values across levels',
      inputs: {},
      check: () => {
        const values = ['low', 'high'].map(mapVariety);
        expect(new Set(values).size).toBe(2);
      },
    },
    {
      name: 'low < high',
      inputs: {},
      check: () => expect(mapVariety('low')).toBeLessThan(mapVariety('high')),
    },
    { name: 'undefined returns default', inputs: { v: undefined }, check: isUndefined() },
    { name: 'passes through raw numbers', inputs: { v: 0.42 }, check: equals(0.42) },
    {
      name: 'unknown string falls back to default',
      inputs: { v: 'zzz' },
      check: ({ result }) => expect(result).toBe(mapVariety(undefined)),
    },
  ],
  process: ({ v }) => mapVariety(v),
});
