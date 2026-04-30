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

const { default: define, compareSchemas } = await import('./index.js');
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

const billingProjection = { projectionName: 'billing', description: 'invoices, charges, refunds' };
const complianceProjection = {
  projectionName: 'compliance',
  description: 'legal, policy, retention',
};
const sentimentProjection = {
  projectionName: 'sentiment',
  description: 'emotional tone and attitude',
};
const urgencyProperty = {
  propertyName: 'urgency',
  valueRange: {
    type: 'continuous',
    low: 0,
    high: 1,
    lowLabel: 'not urgent',
    highLabel: 'critical',
  },
  projectionWeights: { billing: 0.3, compliance: 0.7 },
};
const riskProperty = {
  propertyName: 'riskLevel',
  valueRange: { type: 'categorical', categories: ['low', 'medium', 'high'] },
  projectionWeights: { compliance: 0.9 },
};

describe('compareSchemas', () => {
  it('identifies full overlap when schemas are identical', async () => {
    callLlm.mockResolvedValueOnce({
      projections: {
        overlapping: [
          {
            nameA: 'billing',
            nameB: 'billing',
            semanticSimilarity: 'high',
            rationale: 'Identical projection covering financial transactions',
          },
          {
            nameA: 'compliance',
            nameB: 'compliance',
            semanticSimilarity: 'high',
            rationale: 'Identical projection covering legal and policy',
          },
        ],
        uniqueToA: [],
        uniqueToB: [],
      },
      properties: {
        overlapping: [
          {
            nameA: 'urgency',
            nameB: 'urgency',
            semanticSimilarity: 'high',
            rationale: 'Identical property',
            valueRangeDivergence: 'none',
          },
        ],
        uniqueToA: [],
        uniqueToB: [],
      },
      summary: 'Schemas are identical.',
    });

    const schema = {
      projections: [billingProjection, complianceProjection],
      properties: [urgencyProperty],
    };

    const report = await compareSchemas(schema, schema);

    expect(report.projections.overlapping).toHaveLength(2);
    expect(report.projections.overlapping[0].semanticSimilarity).toBe('high');
    expect(report.projections.uniqueToA).toHaveLength(0);
    expect(report.projections.uniqueToB).toHaveLength(0);
    expect(report.properties.overlapping).toHaveLength(1);
    expect(report.properties.uniqueToA).toHaveLength(0);
    expect(report.properties.uniqueToB).toHaveLength(0);
    expect(report.summary).toBe('Schemas are identical.');
  });

  it('identifies partial overlap between schemas', async () => {
    callLlm.mockResolvedValueOnce({
      projections: {
        overlapping: [
          {
            nameA: 'billing',
            nameB: 'billing',
            semanticSimilarity: 'high',
            rationale: 'Both cover financial transactions',
          },
        ],
        uniqueToA: [complianceProjection],
        uniqueToB: [sentimentProjection],
      },
      properties: {
        overlapping: [],
        uniqueToA: [urgencyProperty],
        uniqueToB: [riskProperty],
      },
      summary: 'Schemas share billing but diverge on secondary concerns.',
    });

    const schemaA = {
      projections: [billingProjection, complianceProjection],
      properties: [urgencyProperty],
    };
    const schemaB = {
      projections: [billingProjection, sentimentProjection],
      properties: [riskProperty],
    };

    const report = await compareSchemas(schemaA, schemaB);

    expect(report.projections.overlapping).toHaveLength(1);
    expect(report.projections.overlapping[0].nameA).toBe('billing');
    expect(report.projections.uniqueToA).toHaveLength(1);
    expect(report.projections.uniqueToA[0].projectionName).toBe('compliance');
    expect(report.projections.uniqueToB).toHaveLength(1);
    expect(report.projections.uniqueToB[0].projectionName).toBe('sentiment');
    expect(report.properties.uniqueToA[0].propertyName).toBe('urgency');
    expect(report.properties.uniqueToB[0].propertyName).toBe('riskLevel');
  });

  it('reports all projections and properties as divergent when schemas share nothing', async () => {
    callLlm.mockResolvedValueOnce({
      projections: {
        overlapping: [],
        uniqueToA: [billingProjection],
        uniqueToB: [sentimentProjection],
      },
      properties: {
        overlapping: [],
        uniqueToA: [urgencyProperty],
        uniqueToB: [riskProperty],
      },
      summary: 'Schemas cover entirely different domains.',
    });

    const schemaA = { projections: [billingProjection], properties: [urgencyProperty] };
    const schemaB = { projections: [sentimentProjection], properties: [riskProperty] };

    const report = await compareSchemas(schemaA, schemaB);

    expect(report.projections.overlapping).toHaveLength(0);
    expect(report.projections.uniqueToA).toHaveLength(1);
    expect(report.projections.uniqueToB).toHaveLength(1);
    expect(report.properties.overlapping).toHaveLength(0);
    expect(report.properties.uniqueToA).toHaveLength(1);
    expect(report.properties.uniqueToB).toHaveLength(1);
  });

  it('handles empty projections and properties gracefully', async () => {
    callLlm.mockResolvedValueOnce({
      projections: { overlapping: [], uniqueToA: [], uniqueToB: [] },
      properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
      summary: 'Both schemas are empty.',
    });

    const empty = { projections: [], properties: [] };
    const report = await compareSchemas(empty, empty);

    expect(report.projections.overlapping).toHaveLength(0);
    expect(report.projections.uniqueToA).toHaveLength(0);
    expect(report.projections.uniqueToB).toHaveLength(0);
    expect(report.properties.overlapping).toHaveLength(0);
    expect(report.summary).toBe('Both schemas are empty.');
  });

  it('throws when schemas are missing projections or properties', async () => {
    await expect(compareSchemas({}, {})).rejects.toThrow(
      /must have projections and properties arrays/
    );
  });

  it('includes both schemas in the prompt', async () => {
    callLlm.mockResolvedValueOnce({
      projections: {
        overlapping: [],
        uniqueToA: [billingProjection],
        uniqueToB: [sentimentProjection],
      },
      properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
      summary: 'Different domains.',
    });

    await compareSchemas(
      { projections: [billingProjection], properties: [] },
      { projections: [sentimentProjection], properties: [] }
    );

    const prompt = callLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('Schema A');
    expect(prompt).toContain('Schema B');
    expect(prompt).toContain('billing');
    expect(prompt).toContain('sentiment');
  });

  it('uses sem_compare jsonSchema for structured output', async () => {
    const { jsonSchema } = await import('../../lib/llm/index.js');
    callLlm.mockResolvedValueOnce({
      projections: { overlapping: [], uniqueToA: [], uniqueToB: [] },
      properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
      summary: 'Empty.',
    });

    await compareSchemas({ projections: [], properties: [] }, { projections: [], properties: [] });

    expect(jsonSchema).toHaveBeenCalledWith('sem_compare', expect.any(Object));
    const llmOptions = callLlm.mock.calls.at(-1)[1];
    expect(llmOptions.responseFormat).toBeDefined();
    expect(llmOptions.temperature).toBe(0);
  });

  it('propagates config through', async () => {
    callLlm.mockResolvedValueOnce({
      projections: { overlapping: [], uniqueToA: [], uniqueToB: [] },
      properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
      summary: 'Empty.',
    });

    await compareSchemas(
      { projections: [], properties: [] },
      { projections: [], properties: [] },
      { traceId: 'compare-trace-1' }
    );

    const llmOptions = callLlm.mock.calls.at(-1)[1];
    expect(llmOptions.traceId).toBe('compare-trace-1');
  });

  it('formats property value ranges in the prompt', async () => {
    callLlm.mockResolvedValueOnce({
      projections: { overlapping: [], uniqueToA: [], uniqueToB: [] },
      properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
      summary: 'Compared.',
    });

    await compareSchemas(
      { projections: [], properties: [urgencyProperty] },
      { projections: [], properties: [riskProperty] }
    );

    const prompt = callLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('urgency');
    expect(prompt).toContain('continuous');
    expect(prompt).toContain('riskLevel');
    expect(prompt).toContain('categorical');
  });
});
