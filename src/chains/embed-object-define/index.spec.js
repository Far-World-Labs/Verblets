import { vi, expect } from 'vitest';
import { runTable } from '../../lib/examples-runner/index.js';

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

// ─── define ─────────────────────────────────────────────────────────────

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
        wantProjectionsLength: 2,
        wantFirstProjectionName: 'billing',
        wantPropertiesLength: 1,
        wantFirstPropertyName: 'urgency',
      },
    },
    {
      name: 'does not include _poles in the returned schema',
      inputs: { args: { exampleTexts: ['test'] }, wantNoPoles: true },
    },
    {
      name: 'passes example texts into the prompt',
      inputs: {
        args: { exampleTexts: ['Invoice overdue', 'Policy violation'] },
        wantPromptContains: ['Invoice overdue', 'Policy violation'],
      },
    },
    {
      name: 'includes seed projection names in the prompt when provided',
      inputs: {
        args: { exampleTexts: ['test'], projectionNames: ['billing', 'timeline'] },
        wantPromptContains: ['billing', 'timeline', 'Suggested projection names'],
      },
    },
    {
      name: 'includes seed property names in the prompt when provided',
      inputs: {
        args: { exampleTexts: ['test'], propertyNames: ['urgency', 'complianceRisk'] },
        wantPromptContains: ['urgency', 'complianceRisk', 'Suggested property names'],
      },
    },
    {
      name: 'uses jsonSchema for structured output',
      inputs: {
        args: { exampleTexts: ['test'] },
        wantSchemaName: 'sem_define',
        wantResponseFormatDefined: true,
      },
    },
    {
      name: 'sets temperature to 0',
      inputs: { args: { exampleTexts: ['test'] }, wantTemperature: 0 },
    },
    {
      name: 'propagates config to nameStep',
      inputs: {
        args: { exampleTexts: ['test'] },
        config: { traceId: 'trace-123' },
        wantTraceId: 'trace-123',
      },
    },
  ],
  process: ({ args, config }) => define(args, config),
  expects: ({ result, inputs }) => {
    if ('wantProjectionsLength' in inputs) {
      expect(result.projections).toHaveLength(inputs.wantProjectionsLength);
      expect(result.projections[0].projectionName).toBe(inputs.wantFirstProjectionName);
      expect(result.properties).toHaveLength(inputs.wantPropertiesLength);
      expect(result.properties[0].propertyName).toBe(inputs.wantFirstPropertyName);
    }
    if (inputs.wantNoPoles) expect(result._poles).toBeUndefined();
    if (inputs.wantPromptContains) {
      const prompt = lastPrompt();
      for (const fragment of inputs.wantPromptContains) expect(prompt).toContain(fragment);
    }
    if (inputs.wantSchemaName) {
      expect(jsonSchema).toHaveBeenCalledWith(inputs.wantSchemaName, expect.any(Object));
    }
    if (inputs.wantResponseFormatDefined) expect(lastOptions().responseFormat).toBeDefined();
    if ('wantTemperature' in inputs) expect(lastOptions().temperature).toBe(inputs.wantTemperature);
    if (inputs.wantTraceId) expect(lastOptions().traceId).toBe(inputs.wantTraceId);
  },
});

// ─── compareSchemas ────────────────────────────────────────────────────

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
        mock: () =>
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
        wantOverlappingLengths: { projections: 2, properties: 1 },
        wantUniqueLengths: { projectionsA: 0, projectionsB: 0, propertiesA: 0, propertiesB: 0 },
        wantFirstProjectionSimilarity: 'high',
        wantSummary: 'Schemas are identical.',
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
        mock: () =>
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
        wantOverlappingLengths: { projections: 1 },
        wantFirstOverlappingNameA: 'billing',
        wantUniqueAName: 'compliance',
        wantUniqueBName: 'sentiment',
        wantUniqueAPropertyName: 'urgency',
        wantUniqueBPropertyName: 'riskLevel',
      },
    },
    {
      name: 'reports all projections and properties as divergent when schemas share nothing',
      inputs: {
        schemaA: { projections: [billingProjection], properties: [urgencyProperty] },
        schemaB: { projections: [sentimentProjection], properties: [riskProperty] },
        mock: () =>
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
        wantOverlappingLengths: { projections: 0, properties: 0 },
        wantUniqueLengths: { projectionsA: 1, projectionsB: 1, propertiesA: 1, propertiesB: 1 },
      },
    },
    {
      name: 'handles empty projections and properties gracefully',
      inputs: {
        schemaA: { projections: [], properties: [] },
        schemaB: { projections: [], properties: [] },
        mock: () =>
          callLlm.mockResolvedValueOnce({
            projections: { overlapping: [], uniqueToA: [], uniqueToB: [] },
            properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
            summary: 'Both schemas are empty.',
          }),
        wantOverlappingLengths: { projections: 0 },
        wantSummary: 'Both schemas are empty.',
      },
    },
    {
      name: 'throws when schemas are missing projections or properties',
      inputs: {
        schemaA: {},
        schemaB: {},
        throws: /must have projections and properties arrays/,
      },
    },
    {
      name: 'includes both schemas in the prompt',
      inputs: {
        schemaA: { projections: [billingProjection], properties: [] },
        schemaB: { projections: [sentimentProjection], properties: [] },
        mock: () =>
          callLlm.mockResolvedValueOnce({
            projections: {
              overlapping: [],
              uniqueToA: [billingProjection],
              uniqueToB: [sentimentProjection],
            },
            properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
            summary: 'Different domains.',
          }),
        wantPromptContains: ['Schema A', 'Schema B', 'billing', 'sentiment'],
      },
    },
    {
      name: 'uses sem_compare jsonSchema for structured output',
      inputs: {
        schemaA: { projections: [], properties: [] },
        schemaB: { projections: [], properties: [] },
        mock: () =>
          callLlm.mockResolvedValueOnce({
            projections: { overlapping: [], uniqueToA: [], uniqueToB: [] },
            properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
            summary: 'Empty.',
          }),
        wantSchemaName: 'sem_compare',
        wantResponseFormatDefined: true,
        wantTemperature: 0,
      },
    },
    {
      name: 'propagates config through',
      inputs: {
        schemaA: { projections: [], properties: [] },
        schemaB: { projections: [], properties: [] },
        config: { traceId: 'compare-trace-1' },
        mock: () =>
          callLlm.mockResolvedValueOnce({
            projections: { overlapping: [], uniqueToA: [], uniqueToB: [] },
            properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
            summary: 'Empty.',
          }),
        wantTraceId: 'compare-trace-1',
      },
    },
    {
      name: 'formats property value ranges in the prompt',
      inputs: {
        schemaA: { projections: [], properties: [urgencyProperty] },
        schemaB: { projections: [], properties: [riskProperty] },
        mock: () =>
          callLlm.mockResolvedValueOnce({
            projections: { overlapping: [], uniqueToA: [], uniqueToB: [] },
            properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
            summary: 'Compared.',
          }),
        wantPromptContains: ['urgency', 'continuous', 'riskLevel', 'categorical'],
      },
    },
  ],
  process: async ({ schemaA, schemaB, config, mock }) => {
    if (mock) mock();
    return compareSchemas(schemaA, schemaB ?? schemaA, config);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if (inputs.wantOverlappingLengths) {
      const ol = inputs.wantOverlappingLengths;
      if ('projections' in ol) {
        expect(result.projections.overlapping).toHaveLength(ol.projections);
      }
      if ('properties' in ol) {
        expect(result.properties.overlapping).toHaveLength(ol.properties);
      }
    }
    if (inputs.wantUniqueLengths) {
      const ul = inputs.wantUniqueLengths;
      if ('projectionsA' in ul) expect(result.projections.uniqueToA).toHaveLength(ul.projectionsA);
      if ('projectionsB' in ul) expect(result.projections.uniqueToB).toHaveLength(ul.projectionsB);
      if ('propertiesA' in ul) expect(result.properties.uniqueToA).toHaveLength(ul.propertiesA);
      if ('propertiesB' in ul) expect(result.properties.uniqueToB).toHaveLength(ul.propertiesB);
    }
    if (inputs.wantFirstProjectionSimilarity) {
      expect(result.projections.overlapping[0].semanticSimilarity).toBe(
        inputs.wantFirstProjectionSimilarity
      );
    }
    if (inputs.wantFirstOverlappingNameA) {
      expect(result.projections.overlapping[0].nameA).toBe(inputs.wantFirstOverlappingNameA);
    }
    if (inputs.wantUniqueAName) {
      expect(result.projections.uniqueToA[0].projectionName).toBe(inputs.wantUniqueAName);
    }
    if (inputs.wantUniqueBName) {
      expect(result.projections.uniqueToB[0].projectionName).toBe(inputs.wantUniqueBName);
    }
    if (inputs.wantUniqueAPropertyName) {
      expect(result.properties.uniqueToA[0].propertyName).toBe(inputs.wantUniqueAPropertyName);
    }
    if (inputs.wantUniqueBPropertyName) {
      expect(result.properties.uniqueToB[0].propertyName).toBe(inputs.wantUniqueBPropertyName);
    }
    if (inputs.wantSummary) expect(result.summary).toBe(inputs.wantSummary);
    if (inputs.wantPromptContains) {
      const prompt = lastPrompt();
      for (const fragment of inputs.wantPromptContains) expect(prompt).toContain(fragment);
    }
    if (inputs.wantSchemaName) {
      expect(jsonSchema).toHaveBeenCalledWith(inputs.wantSchemaName, expect.any(Object));
    }
    if (inputs.wantResponseFormatDefined) expect(lastOptions().responseFormat).toBeDefined();
    if ('wantTemperature' in inputs) expect(lastOptions().temperature).toBe(inputs.wantTemperature);
    if (inputs.wantTraceId) expect(lastOptions().traceId).toBe(inputs.wantTraceId);
  },
});
