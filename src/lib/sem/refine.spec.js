import { describe, it, expect, vi } from 'vitest';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(async () => ({
    projections: [
      { projectionName: 'billing', description: 'invoices and charges' },
      { projectionName: 'compliance', description: 'legal and policy' },
      { projectionName: 'launchExposure', description: 'rollout timing and revenue risk' },
    ],
    properties: [
      {
        propertyName: 'urgency',
        valueRange: {
          type: 'continuous',
          low: 0,
          high: 1,
          lowLabel: 'not urgent',
          highLabel: 'critical',
        },
        projectionWeights: { billing: 0.3, compliance: 0.5, launchExposure: 0.8 },
      },
      {
        propertyName: 'launchCriticality',
        valueRange: {
          type: 'continuous',
          low: 0,
          high: 1,
          lowLabel: 'no impact',
          highLabel: 'blocks launch',
        },
        projectionWeights: { launchExposure: 1.0, billing: 0.2 },
      },
    ],
  })),
  jsonSchema: vi.fn((name, schema) => ({ type: 'json_schema', json_schema: { name, schema } })),
}));

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn((fn) => fn()),
}));

const { default: refine } = await import('./refine.js');
const callLlm = (await import('../../lib/llm/index.js')).default;

const existingSchema = {
  projections: [
    { projectionName: 'billing', description: 'invoices and charges' },
    { projectionName: 'compliance', description: 'legal and policy' },
  ],
  properties: [
    {
      propertyName: 'urgency',
      valueRange: {
        type: 'continuous',
        low: 0,
        high: 1,
        lowLabel: 'not urgent',
        highLabel: 'critical',
      },
      projectionWeights: { billing: 0.3, compliance: 0.7 },
    },
  ],
};

const studySet = {
  selectedStateIds: ['ticket:4812', 'ticket:4921', 'ticket:4993'],
  noteText: 'These cluster together but current properties do not explain why.',
};

describe('refine', () => {
  it('returns a revised schema with new projections and properties', async () => {
    const schema = await refine({ schema: existingSchema, studySet });

    expect(schema.projections).toHaveLength(3);
    const names = schema.projections.map((p) => p.projectionName);
    expect(names).toContain('launchExposure');

    expect(schema.properties).toHaveLength(2);
    const propNames = schema.properties.map((p) => p.propertyName);
    expect(propNames).toContain('launchCriticality');
  });

  it('does not include _poles in the returned schema', async () => {
    const schema = await refine({ schema: existingSchema, studySet });
    expect(schema._poles).toBeUndefined();
  });

  it('passes current schema into the prompt', async () => {
    await refine({ schema: existingSchema, studySet });

    const prompt = callLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('billing');
    expect(prompt).toContain('compliance');
    expect(prompt).toContain('urgency');
  });

  it('passes study set details into the prompt', async () => {
    await refine({ schema: existingSchema, studySet });

    const prompt = callLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('ticket:4812');
    expect(prompt).toContain('ticket:4921');
    expect(prompt).toContain('ticket:4993');
    expect(prompt).toContain('cluster together but current properties do not explain why');
  });

  it('includes property weights and ranges in the prompt', async () => {
    await refine({ schema: existingSchema, studySet });

    const prompt = callLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('not urgent');
    expect(prompt).toContain('critical');
    expect(prompt).toContain('billing:0.3');
  });

  it('propagates config to callLlm', async () => {
    await refine({ schema: existingSchema, studySet }, { traceId: 'trace-xyz' });

    const llmOptions = callLlm.mock.calls.at(-1)[1];
    expect(llmOptions.traceId).toBe('trace-xyz');
  });
});
