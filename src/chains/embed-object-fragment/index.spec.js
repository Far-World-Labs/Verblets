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
        wantLength: 1,
        wantFragmentSetId: 'fs:ticket:1',
        wantFragmentsLength: 2,
        wantBilling: {
          text: 'The invoice is still wrong.',
          fragmentKind: 'literal',
          sourceIds: ['ticket:1'],
        },
      },
    },
    {
      name: 'passes projection descriptions into the prompt',
      inputs: {
        sourceTexts: [{ sourceId: 's1', text: 'test' }],
        wantPromptContains: ['billing', 'invoices and charges', 'compliance', 'legal and policy'],
      },
    },
    {
      name: 'passes source text into the prompt',
      inputs: {
        sourceTexts: [{ sourceId: 'ticket:99', text: 'Overcharged by $500' }],
        wantPromptContains: ['Overcharged by $500', 'ticket:99'],
      },
    },
    {
      name: 'assigns unique fragment IDs',
      inputs: { sourceTexts: [{ sourceId: 's1', text: 'test' }], wantUniqueIds: true },
    },
    {
      name: 'batches large source sets',
      inputs: {
        sourceTexts: Array.from({ length: 12 }, (_, i) => ({
          sourceId: `s:${i}`,
          text: `Text ${i}`,
        })),
        mock: () => parallel.mockClear(),
        wantBatchLengths: [5, 5, 2],
      },
    },
    {
      name: 'handles single source text without batching issues',
      inputs: { sourceTexts: [{ sourceId: 's1', text: 'Single item' }], wantLength: 1 },
    },
    {
      name: 'propagates config to callLlm',
      inputs: {
        sourceTexts: [{ sourceId: 's1', text: 'test' }],
        config: { traceId: 'trace-abc' },
        wantTraceId: 'trace-abc',
      },
    },
  ],
  process: async ({ sourceTexts, config, mock }) => {
    if (mock) mock();
    return fragment({ sourceTexts, schema }, config);
  },
  expects: ({ result, inputs }) => {
    if ('wantLength' in inputs) expect(result).toHaveLength(inputs.wantLength);
    if (inputs.wantFragmentSetId) expect(result[0].fragmentSetId).toBe(inputs.wantFragmentSetId);
    if ('wantFragmentsLength' in inputs) {
      expect(result[0].fragments).toHaveLength(inputs.wantFragmentsLength);
    }
    if (inputs.wantBilling) {
      const billing = result[0].fragments.find((f) => f.projectionName === 'billing');
      expect(billing).toMatchObject(inputs.wantBilling);
      expect(billing.fragmentId).toBeTruthy();
    }
    if (inputs.wantPromptContains) {
      const prompt = callLlm.mock.calls.at(-1)[0];
      for (const fragment of inputs.wantPromptContains) expect(prompt).toContain(fragment);
    }
    if (inputs.wantUniqueIds) {
      const ids = result[0].fragments.map((f) => f.fragmentId);
      expect(new Set(ids).size).toBe(ids.length);
    }
    if (inputs.wantBatchLengths) {
      expect(parallel).toHaveBeenCalled();
      const batches = parallel.mock.calls[0][0];
      expect(batches).toHaveLength(inputs.wantBatchLengths.length);
      inputs.wantBatchLengths.forEach((n, i) => expect(batches[i]).toHaveLength(n));
    }
    if (inputs.wantTraceId) {
      expect(callLlm.mock.calls.at(-1)[1].traceId).toBe(inputs.wantTraceId);
    }
  },
});
