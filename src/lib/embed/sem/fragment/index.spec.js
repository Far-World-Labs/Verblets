import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../llm/index.js', () => ({
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

vi.mock('../../../retry/index.js', () => ({
  default: vi.fn((fn) => fn()),
}));

vi.mock('../../../parallel-batch/index.js', () => ({
  default: vi.fn(async (items, fn) => {
    const results = [];
    for (const item of items) results.push(await fn(item));
    return results;
  }),
}));

const { default: fragment } = await import('./index.js');
const callLlm = (await import('../../../llm/index.js')).default;

const schema = {
  projections: [
    { projectionName: 'billing', description: 'invoices and charges' },
    { projectionName: 'compliance', description: 'legal and policy' },
  ],
  properties: [],
};

describe('fragment', () => {
  it('returns fragment sets with generated IDs and provenance', async () => {
    const sourceTexts = [
      {
        sourceId: 'ticket:1',
        text: 'The invoice is still wrong. Legal thinks the retention language is risky.',
      },
    ];

    const result = await fragment({ sourceTexts, schema });

    expect(result).toHaveLength(1);
    expect(result[0].fragmentSetId).toBe('fs:ticket:1');
    expect(result[0].fragments).toHaveLength(2);

    const billing = result[0].fragments.find((f) => f.projectionName === 'billing');
    expect(billing.text).toBe('The invoice is still wrong.');
    expect(billing.fragmentKind).toBe('literal');
    expect(billing.sourceIds).toEqual(['ticket:1']);
    expect(billing.fragmentId).toBeTruthy();
  });

  it('passes projection descriptions into the prompt', async () => {
    await fragment({
      sourceTexts: [{ sourceId: 's1', text: 'test' }],
      schema,
    });

    const prompt = callLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('billing');
    expect(prompt).toContain('invoices and charges');
    expect(prompt).toContain('compliance');
    expect(prompt).toContain('legal and policy');
  });

  it('passes source text into the prompt', async () => {
    await fragment({
      sourceTexts: [{ sourceId: 'ticket:99', text: 'Overcharged by $500' }],
      schema,
    });

    const prompt = callLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('Overcharged by $500');
    expect(prompt).toContain('ticket:99');
  });

  it('assigns unique fragment IDs', async () => {
    const result = await fragment({
      sourceTexts: [{ sourceId: 's1', text: 'test' }],
      schema,
    });

    const ids = result[0].fragments.map((f) => f.fragmentId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('batches large source sets', async () => {
    const parallel = (await import('../../../parallel-batch/index.js')).default;
    parallel.mockClear();

    const sourceTexts = Array.from({ length: 12 }, (_, i) => ({
      sourceId: `s:${i}`,
      text: `Text ${i}`,
    }));

    await fragment({ sourceTexts, schema });

    // With default batchSize=5, 12 items → 3 batches
    expect(parallel).toHaveBeenCalled();
    const batches = parallel.mock.calls[0][0];
    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(5);
    expect(batches[1]).toHaveLength(5);
    expect(batches[2]).toHaveLength(2);
  });

  it('handles single source text without batching issues', async () => {
    const result = await fragment({
      sourceTexts: [{ sourceId: 's1', text: 'Single item' }],
      schema,
    });
    expect(result).toHaveLength(1);
  });

  it('propagates config to callLlm', async () => {
    await fragment(
      { sourceTexts: [{ sourceId: 's1', text: 'test' }], schema },
      { traceId: 'trace-abc' }
    );

    const llmOptions = callLlm.mock.calls.at(-1)[1];
    expect(llmOptions.traceId).toBe('trace-abc');
  });
});
