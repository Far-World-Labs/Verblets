import { vi, expect } from 'vitest';
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
      inputs: { name: 'test', wantRootName: 'test', wantEmptyTree: true },
    },
  ],
  process: ({ name }) => dismantle(name),
  expects: ({ result, inputs }) => {
    expect(result.rootName).toBe(inputs.wantRootName);
    expect(result).toHaveProperty('tree');
    if (inputs.wantEmptyTree) expect(result.getTree()).toEqual({});
  },
});

// mapVariety: pure function with simple value mappings.
runTable({
  describe: 'mapVariety',
  examples: [
    { name: 'undefined returns default', inputs: { v: undefined, want: undefined } },
    { name: 'passes through raw numbers', inputs: { v: 0.42, want: 0.42 } },
    {
      name: 'unknown string falls back to default',
      inputs: { v: 'zzz', want: undefined },
    },
  ],
  process: ({ v }) => mapVariety(v),
  expects: ({ result, inputs }) => expect(result).toEqual(inputs.want),
});

// Distinctness/ordering tests (relational, not per-row data) — kept as
// describe/it because they compare multiple invocations.
import { describe, it } from 'vitest';
describe('mapVariety: relational checks', () => {
  it('produces distinct values across levels', () => {
    const values = ['low', 'high'].map(mapVariety);
    expect(new Set(values).size).toBe(2);
  });

  it('low < high', () => {
    expect(mapVariety('low')).toBeLessThan(mapVariety('high'));
  });
});
