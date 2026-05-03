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

const lastPrompt = () => callLlm.mock.calls.at(-1)[0];
const lastOptions = () => callLlm.mock.calls.at(-1)[1];

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
      check: ({ result }) => {
        expect(result).toHaveLength(1);
        expect(result[0].fragmentSetId).toBe('fs:ticket:1');
        expect(result[0].fragments).toHaveLength(2);
        const billing = result[0].fragments.find((f) => f.projectionName === 'billing');
        expect(billing).toMatchObject({
          text: 'The invoice is still wrong.',
          fragmentKind: 'literal',
          sourceIds: ['ticket:1'],
        });
        expect(billing.fragmentId).toBeTruthy();
      },
    },
    {
      name: 'passes projection descriptions into the prompt',
      inputs: { sourceTexts: [{ sourceId: 's1', text: 'test' }] },
      check: () => {
        const prompt = lastPrompt();
        expect(prompt).toContain('billing');
        expect(prompt).toContain('invoices and charges');
        expect(prompt).toContain('compliance');
        expect(prompt).toContain('legal and policy');
      },
    },
    {
      name: 'passes source text into the prompt',
      inputs: { sourceTexts: [{ sourceId: 'ticket:99', text: 'Overcharged by $500' }] },
      check: () => {
        const prompt = lastPrompt();
        expect(prompt).toContain('Overcharged by $500');
        expect(prompt).toContain('ticket:99');
      },
    },
    {
      name: 'assigns unique fragment IDs',
      inputs: { sourceTexts: [{ sourceId: 's1', text: 'test' }] },
      check: ({ result }) => {
        const ids = result[0].fragments.map((f) => f.fragmentId);
        expect(new Set(ids).size).toBe(ids.length);
      },
    },
    {
      name: 'batches large source sets',
      inputs: {
        sourceTexts: Array.from({ length: 12 }, (_, i) => ({
          sourceId: `s:${i}`,
          text: `Text ${i}`,
        })),
        preMock: () => parallel.mockClear(),
      },
      check: () => {
        expect(parallel).toHaveBeenCalled();
        const batches = parallel.mock.calls[0][0];
        expect(batches).toHaveLength(3);
        expect(batches[0]).toHaveLength(5);
        expect(batches[1]).toHaveLength(5);
        expect(batches[2]).toHaveLength(2);
      },
    },
    {
      name: 'handles single source text without batching issues',
      inputs: { sourceTexts: [{ sourceId: 's1', text: 'Single item' }] },
      check: ({ result }) => expect(result).toHaveLength(1),
    },
    {
      name: 'propagates config to callLlm',
      inputs: {
        sourceTexts: [{ sourceId: 's1', text: 'test' }],
        config: { traceId: 'trace-abc' },
      },
      check: () => expect(lastOptions().traceId).toBe('trace-abc'),
    },
  ],
  process: async ({ sourceTexts, config, preMock }) => {
    if (preMock) preMock();
    return fragment({ sourceTexts, schema }, config);
  },
});
