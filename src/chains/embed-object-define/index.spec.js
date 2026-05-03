import { vi, expect } from 'vitest';
import { runTable, throws } from '../../lib/examples-runner/index.js';

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

vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn((fn) => fn()) }));

const { default: define, compareSchemas } = await import('./index.js');
const callLlm = (await import('../../lib/llm/index.js')).default;
const { jsonSchema } = await import('../../lib/llm/index.js');

const lastPrompt = () => callLlm.mock.calls.at(-1)[0];
const lastOptions = () => callLlm.mock.calls.at(-1)[1];

// ─── define ───────────────────────────────────────────────────────────────

runTable({
  describe: 'define',
  examples: [
    {
      name: 'returns a schema with projections and properties',
      inputs: {
        args: {
          exampleTexts: [
            'The invoice is still wrong.',
            'Legal thinks the retention language is risky.',
          ],
        },
      },
      check: ({ result }) => {
        expect(result.projections).toHaveLength(2);
        expect(result.projections[0].projectionName).toBe('billing');
        expect(result.properties).toHaveLength(1);
        expect(result.properties[0].propertyName).toBe('urgency');
      },
    },
    {
      name: 'does not include _poles in the returned schema',
      inputs: { args: { exampleTexts: ['test'] } },
      check: ({ result }) => expect(result._poles).toBeUndefined(),
    },
    {
      name: 'passes example texts into the prompt',
      inputs: { args: { exampleTexts: ['Invoice overdue', 'Policy violation'] } },
      check: () => {
        const prompt = lastPrompt();
        expect(prompt).toContain('Invoice overdue');
        expect(prompt).toContain('Policy violation');
      },
    },
    {
      name: 'includes seed projection names in the prompt when provided',
      inputs: {
        args: { exampleTexts: ['test'], projectionNames: ['billing', 'timeline'] },
      },
      check: () => {
        const prompt = lastPrompt();
        expect(prompt).toContain('billing');
        expect(prompt).toContain('timeline');
        expect(prompt).toContain('Suggested projection names');
      },
    },
    {
      name: 'includes seed property names in the prompt when provided',
      inputs: {
        args: { exampleTexts: ['test'], propertyNames: ['urgency', 'complianceRisk'] },
      },
      check: () => {
        const prompt = lastPrompt();
        expect(prompt).toContain('urgency');
        expect(prompt).toContain('complianceRisk');
        expect(prompt).toContain('Suggested property names');
      },
    },
    {
      name: 'uses jsonSchema for structured output',
      inputs: { args: { exampleTexts: ['test'] } },
      check: () => {
        expect(jsonSchema).toHaveBeenCalledWith('sem_define', expect.any(Object));
        expect(lastOptions().responseFormat).toBeDefined();
      },
    },
    {
      name: 'sets temperature to 0',
      inputs: { args: { exampleTexts: ['test'] } },
      check: () => expect(lastOptions().temperature).toBe(0),
    },
    {
      name: 'propagates config to nameStep',
      inputs: { args: { exampleTexts: ['test'] }, config: { traceId: 'trace-123' } },
      check: () => expect(lastOptions().traceId).toBe('trace-123'),
    },
  ],
  process: ({ args, config }) => define(args, config),
});

// ─── compareSchemas ───────────────────────────────────────────────────────

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

runTable({
  describe: 'compareSchemas',
  examples: [
    {
      name: 'identifies full overlap when schemas are identical',
      inputs: {
        schemaA: {
          projections: [billingProjection, complianceProjection],
          properties: [urgencyProperty],
        },
        schemaB: null,
        preMock: () =>
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
          }),
      },
      check: ({ result }) => {
        expect(result.projections.overlapping).toHaveLength(2);
        expect(result.projections.overlapping[0].semanticSimilarity).toBe('high');
        expect(result.projections.uniqueToA).toHaveLength(0);
        expect(result.projections.uniqueToB).toHaveLength(0);
        expect(result.properties.overlapping).toHaveLength(1);
        expect(result.properties.uniqueToA).toHaveLength(0);
        expect(result.properties.uniqueToB).toHaveLength(0);
        expect(result.summary).toBe('Schemas are identical.');
      },
    },
    {
      name: 'identifies partial overlap between schemas',
      inputs: {
        schemaA: {
          projections: [billingProjection, complianceProjection],
          properties: [urgencyProperty],
        },
        schemaB: {
          projections: [billingProjection, sentimentProjection],
          properties: [riskProperty],
        },
        preMock: () =>
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
          }),
      },
      check: ({ result }) => {
        expect(result.projections.overlapping).toHaveLength(1);
        expect(result.projections.overlapping[0].nameA).toBe('billing');
        expect(result.projections.uniqueToA[0].projectionName).toBe('compliance');
        expect(result.projections.uniqueToB[0].projectionName).toBe('sentiment');
        expect(result.properties.uniqueToA[0].propertyName).toBe('urgency');
        expect(result.properties.uniqueToB[0].propertyName).toBe('riskLevel');
      },
    },
    {
      name: 'reports all projections and properties as divergent when schemas share nothing',
      inputs: {
        schemaA: { projections: [billingProjection], properties: [urgencyProperty] },
        schemaB: { projections: [sentimentProjection], properties: [riskProperty] },
        preMock: () =>
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
          }),
      },
      check: ({ result }) => {
        expect(result.projections.overlapping).toHaveLength(0);
        expect(result.projections.uniqueToA).toHaveLength(1);
        expect(result.projections.uniqueToB).toHaveLength(1);
        expect(result.properties.overlapping).toHaveLength(0);
        expect(result.properties.uniqueToA).toHaveLength(1);
        expect(result.properties.uniqueToB).toHaveLength(1);
      },
    },
    {
      name: 'handles empty projections and properties gracefully',
      inputs: {
        schemaA: { projections: [], properties: [] },
        schemaB: { projections: [], properties: [] },
        preMock: () =>
          callLlm.mockResolvedValueOnce({
            projections: { overlapping: [], uniqueToA: [], uniqueToB: [] },
            properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
            summary: 'Both schemas are empty.',
          }),
      },
      check: ({ result }) => {
        expect(result.projections.overlapping).toHaveLength(0);
        expect(result.summary).toBe('Both schemas are empty.');
      },
    },
    {
      name: 'throws when schemas are missing projections or properties',
      inputs: { schemaA: {}, schemaB: {} },
      check: throws(/must have projections and properties arrays/),
    },
    {
      name: 'includes both schemas in the prompt',
      inputs: {
        schemaA: { projections: [billingProjection], properties: [] },
        schemaB: { projections: [sentimentProjection], properties: [] },
        preMock: () =>
          callLlm.mockResolvedValueOnce({
            projections: {
              overlapping: [],
              uniqueToA: [billingProjection],
              uniqueToB: [sentimentProjection],
            },
            properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
            summary: 'Different domains.',
          }),
      },
      check: () => {
        const prompt = lastPrompt();
        expect(prompt).toContain('Schema A');
        expect(prompt).toContain('Schema B');
        expect(prompt).toContain('billing');
        expect(prompt).toContain('sentiment');
      },
    },
    {
      name: 'uses sem_compare jsonSchema for structured output',
      inputs: {
        schemaA: { projections: [], properties: [] },
        schemaB: { projections: [], properties: [] },
        preMock: () =>
          callLlm.mockResolvedValueOnce({
            projections: { overlapping: [], uniqueToA: [], uniqueToB: [] },
            properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
            summary: 'Empty.',
          }),
      },
      check: () => {
        expect(jsonSchema).toHaveBeenCalledWith('sem_compare', expect.any(Object));
        expect(lastOptions().responseFormat).toBeDefined();
        expect(lastOptions().temperature).toBe(0);
      },
    },
    {
      name: 'propagates config through',
      inputs: {
        schemaA: { projections: [], properties: [] },
        schemaB: { projections: [], properties: [] },
        config: { traceId: 'compare-trace-1' },
        preMock: () =>
          callLlm.mockResolvedValueOnce({
            projections: { overlapping: [], uniqueToA: [], uniqueToB: [] },
            properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
            summary: 'Empty.',
          }),
      },
      check: () => expect(lastOptions().traceId).toBe('compare-trace-1'),
    },
    {
      name: 'formats property value ranges in the prompt',
      inputs: {
        schemaA: { projections: [], properties: [urgencyProperty] },
        schemaB: { projections: [], properties: [riskProperty] },
        preMock: () =>
          callLlm.mockResolvedValueOnce({
            projections: { overlapping: [], uniqueToA: [], uniqueToB: [] },
            properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
            summary: 'Compared.',
          }),
      },
      check: () => {
        const prompt = lastPrompt();
        expect(prompt).toContain('urgency');
        expect(prompt).toContain('continuous');
        expect(prompt).toContain('riskLevel');
        expect(prompt).toContain('categorical');
      },
    },
  ],
  process: async ({ schemaA, schemaB, config, preMock }) => {
    if (preMock) preMock();
    return compareSchemas(schemaA, schemaB ?? schemaA, config);
  },
});
