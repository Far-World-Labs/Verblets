import { describe, it, expect, vi } from 'vitest';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(async () => ({
    projections: [
      { projectionName: 'billing', description: 'invoices, charges, refunds' },
      { projectionName: 'compliance', description: 'legal, policy, retention' },
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
  })),
  jsonSchema: vi.fn((name, schema) => ({ type: 'json_schema', json_schema: { name, schema } })),
}));

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn((fn) => fn()),
}));

const { default: define } = await import('./index.js');
const callLlm = (await import('../../lib/llm/index.js')).default;

describe('define', () => {
  it('returns a schema with projections and properties', async () => {
    const schema = await define({
      exampleTexts: [
        'The invoice is still wrong.',
        'Legal thinks the retention language is risky.',
      ],
    });

    expect(schema.projections).toHaveLength(2);
    expect(schema.projections[0].projectionName).toBe('billing');
    expect(schema.properties).toHaveLength(1);
    expect(schema.properties[0].propertyName).toBe('urgency');
  });

  it('does not include _poles in the returned schema', async () => {
    const schema = await define({ exampleTexts: ['test'] });
    expect(schema._poles).toBeUndefined();
  });

  it('passes example texts into the prompt', async () => {
    await define({ exampleTexts: ['Invoice overdue', 'Policy violation'] });

    const prompt = callLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('Invoice overdue');
    expect(prompt).toContain('Policy violation');
  });

  it('includes seed projection names in the prompt when provided', async () => {
    await define({
      exampleTexts: ['test'],
      projectionNames: ['billing', 'timeline'],
    });

    const prompt = callLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('billing');
    expect(prompt).toContain('timeline');
    expect(prompt).toContain('Suggested projection names');
  });

  it('includes seed property names in the prompt when provided', async () => {
    await define({
      exampleTexts: ['test'],
      propertyNames: ['urgency', 'complianceRisk'],
    });

    const prompt = callLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('urgency');
    expect(prompt).toContain('complianceRisk');
    expect(prompt).toContain('Suggested property names');
  });

  it('uses jsonSchema for structured output', async () => {
    const { jsonSchema } = await import('../../lib/llm/index.js');
    await define({ exampleTexts: ['test'] });

    expect(jsonSchema).toHaveBeenCalledWith('sem_define', expect.any(Object));
    const llmOptions = callLlm.mock.calls.at(-1)[1];
    expect(llmOptions.responseFormat).toBeDefined();
  });

  it('sets temperature to 0', async () => {
    await define({ exampleTexts: ['test'] });
    const llmOptions = callLlm.mock.calls.at(-1)[1];
    expect(llmOptions.temperature).toBe(0);
  });

  it('propagates config to nameStep', async () => {
    await define({ exampleTexts: ['test'] }, { traceId: 'trace-123' });
    const llmOptions = callLlm.mock.calls.at(-1)[1];
    expect(llmOptions.traceId).toBe('trace-123');
  });
});
