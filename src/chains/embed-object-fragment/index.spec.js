import { vi, expect } from 'vitest';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(async () => [
    {
      sourceIndex: 0,
      fragments: [
        { text: 'The invoice is still wrong.', fragmentKind: 'literal', projectionName: 'billing' },
        {
          text: 'Legal thinks the retention language is risky.',
          fragmentKind: 'literal',
          projectionName: 'compliance',
        },
      ],
    },
  ]),
  jsonSchema: vi.fn((name, schema) => ({ type: 'json_schema', json_schema: { name, schema } })),
}));

vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn((fn) => fn()) }));

vi.mock('../../lib/parallel-batch/index.js', () => ({
  default: vi.fn(async (items, fn) => {
    const results = [];
    for (const item of items) results.push(await fn(item));
    return results;
  }),
}));

const { default: fragment } = await import('./index.js');
const callLlm = (await import('../../lib/llm/index.js')).default;
const parallel = (await import('../../lib/parallel-batch/index.js')).default;

const schema = {
  projections: [
    { projectionName: 'billing', description: 'invoices and charges' },
    { projectionName: 'compliance', description: 'legal and policy' },
  ],
  properties: [],
};

runTable({
  describe: 'fragment',
  examples: [
    {
      name: 'returns fragment sets with generated IDs and provenance',
      inputs: {
        sourceTexts: [
          {
            sourceId: 'ticket:1',
            text: 'The invoice is still wrong. Legal thinks the retention language is risky.',
          },
        ],
      },
      want: {
        length: 1,
        fragmentSetId: 'fs:ticket:1',
        fragmentsLength: 2,
        billing: {
          text: 'The invoice is still wrong.',
          fragmentKind: 'literal',
          sourceIds: ['ticket:1'],
        },
      },
    },
    {
      name: 'passes projection descriptions into the prompt',
      inputs: { sourceTexts: [{ sourceId: 's1', text: 'test' }] },
      want: {
        promptContains: ['billing', 'invoices and charges', 'compliance', 'legal and policy'],
      },
    },
    {
      name: 'passes source text into the prompt',
      inputs: { sourceTexts: [{ sourceId: 'ticket:99', text: 'Overcharged by $500' }] },
      want: { promptContains: ['Overcharged by $500', 'ticket:99'] },
    },
    {
      name: 'assigns unique fragment IDs',
      inputs: { sourceTexts: [{ sourceId: 's1', text: 'test' }] },
      want: { uniqueIds: true },
    },
    {
      name: 'batches large source sets',
      inputs: {
        sourceTexts: Array.from({ length: 12 }, (_, i) => ({
          sourceId: `s:${i}`,
          text: `Text ${i}`,
        })),
        clearParallel: true,
      },
      want: { batchLengths: [5, 5, 2] },
    },
    {
      name: 'handles single source text without batching issues',
      inputs: { sourceTexts: [{ sourceId: 's1', text: 'Single item' }] },
      want: { length: 1 },
    },
    {
      name: 'propagates config to callLlm',
      inputs: {
        sourceTexts: [{ sourceId: 's1', text: 'test' }],
        config: { traceId: 'trace-abc' },
      },
      want: { traceId: 'trace-abc' },
    },
  ],
  process: async ({ inputs }) => {
    if (inputs.clearParallel) parallel.mockClear();
    return fragment({ sourceTexts: inputs.sourceTexts, schema }, inputs.config);
  },
  expects: ({ result, want }) => {
    if ('length' in want) expect(result).toHaveLength(want.length);
    if (want.fragmentSetId) expect(result[0].fragmentSetId).toBe(want.fragmentSetId);
    if ('fragmentsLength' in want) {
      expect(result[0].fragments).toHaveLength(want.fragmentsLength);
    }
    if (want.billing) {
      const billing = result[0].fragments.find((f) => f.projectionName === 'billing');
      expect(billing).toMatchObject(want.billing);
      expect(billing.fragmentId).toBeTruthy();
    }
    if (want.promptContains) {
      const prompt = callLlm.mock.calls.at(-1)[0];
      for (const fragment of want.promptContains) expect(prompt).toContain(fragment);
    }
    if (want.uniqueIds) {
      const ids = result[0].fragments.map((f) => f.fragmentId);
      expect(new Set(ids).size).toBe(ids.length);
    }
    if (want.batchLengths) {
      expect(parallel).toHaveBeenCalled();
      const batches = parallel.mock.calls[0][0];
      expect(batches).toHaveLength(want.batchLengths.length);
      want.batchLengths.forEach((n, i) => expect(batches[i]).toHaveLength(n));
    }
    if (want.traceId) {
      expect(callLlm.mock.calls.at(-1)[1].traceId).toBe(want.traceId);
    }
  },
});
