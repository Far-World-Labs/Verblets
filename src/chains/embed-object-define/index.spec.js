import { vi, expect } from 'vitest';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

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
      want: {
        projectionsLength: 2,
        firstProjectionName: 'billing',
        propertiesLength: 1,
        firstPropertyName: 'urgency',
      },
    },
    {
      name: 'does not include _poles in the returned schema',
      inputs: { args: { exampleTexts: ['test'] } },
      want: { noPoles: true },
    },
    {
      name: 'passes example texts into the prompt',
      inputs: { args: { exampleTexts: ['Invoice overdue', 'Policy violation'] } },
      want: { promptContains: ['Invoice overdue', 'Policy violation'] },
    },
    {
      name: 'includes seed projection names in the prompt when provided',
      inputs: { args: { exampleTexts: ['test'], projectionNames: ['billing', 'timeline'] } },
      want: { promptContains: ['billing', 'timeline', 'Suggested projection names'] },
    },
    {
      name: 'includes seed property names in the prompt when provided',
      inputs: { args: { exampleTexts: ['test'], propertyNames: ['urgency', 'complianceRisk'] } },
      want: { promptContains: ['urgency', 'complianceRisk', 'Suggested property names'] },
    },
    {
      name: 'uses jsonSchema for structured output',
      inputs: { args: { exampleTexts: ['test'] } },
      want: { schemaName: 'sem_define', responseFormatDefined: true },
    },
    {
      name: 'sets temperature to 0',
      inputs: { args: { exampleTexts: ['test'] } },
      want: { temperature: 0 },
    },
    {
      name: 'propagates config to nameStep',
      inputs: { args: { exampleTexts: ['test'] }, config: { traceId: 'trace-123' } },
      want: { traceId: 'trace-123' },
    },
  ],
  process: ({ inputs }) => define(inputs.args, inputs.config),
  expects: ({ result, want }) => {
    if ('projectionsLength' in want) {
      expect(result.projections).toHaveLength(want.projectionsLength);
      expect(result.projections[0].projectionName).toBe(want.firstProjectionName);
      expect(result.properties).toHaveLength(want.propertiesLength);
      expect(result.properties[0].propertyName).toBe(want.firstPropertyName);
    }
    if (want.noPoles) expect(result._poles).toBeUndefined();
    if (want.promptContains) {
      const prompt = lastPrompt();
      for (const fragment of want.promptContains) expect(prompt).toContain(fragment);
    }
    if (want.schemaName) {
      expect(jsonSchema).toHaveBeenCalledWith(want.schemaName, expect.any(Object));
    }
    if (want.responseFormatDefined) expect(lastOptions().responseFormat).toBeDefined();
    if ('temperature' in want) expect(lastOptions().temperature).toBe(want.temperature);
    if (want.traceId) expect(lastOptions().traceId).toBe(want.traceId);
  },
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

const identicalResponse = {
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
};

const partialResponse = {
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
  properties: { overlapping: [], uniqueToA: [urgencyProperty], uniqueToB: [riskProperty] },
  summary: 'Schemas share billing but diverge on secondary concerns.',
};

const divergentResponse = {
  projections: {
    overlapping: [],
    uniqueToA: [billingProjection],
    uniqueToB: [sentimentProjection],
  },
  properties: { overlapping: [], uniqueToA: [urgencyProperty], uniqueToB: [riskProperty] },
  summary: 'Schemas cover entirely different domains.',
};

const emptyResponse = {
  projections: { overlapping: [], uniqueToA: [], uniqueToB: [] },
  properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
  summary: 'Both schemas are empty.',
};

const promptResponse = {
  projections: {
    overlapping: [],
    uniqueToA: [billingProjection],
    uniqueToB: [sentimentProjection],
  },
  properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
  summary: 'Different domains.',
};

const blankResponse = {
  projections: { overlapping: [], uniqueToA: [], uniqueToB: [] },
  properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
  summary: 'Empty.',
};

const comparedResponse = {
  projections: { overlapping: [], uniqueToA: [], uniqueToB: [] },
  properties: { overlapping: [], uniqueToA: [], uniqueToB: [] },
  summary: 'Compared.',
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
      },
      mocks: { callLlm: [identicalResponse] },
      want: {
        overlappingLengths: { projections: 2, properties: 1 },
        uniqueLengths: { projectionsA: 0, projectionsB: 0, propertiesA: 0, propertiesB: 0 },
        firstProjectionSimilarity: 'high',
        summary: 'Schemas are identical.',
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
      },
      mocks: { callLlm: [partialResponse] },
      want: {
        overlappingLengths: { projections: 1 },
        firstOverlappingNameA: 'billing',
        uniqueAName: 'compliance',
        uniqueBName: 'sentiment',
        uniqueAPropertyName: 'urgency',
        uniqueBPropertyName: 'riskLevel',
      },
    },
    {
      name: 'reports all projections and properties as divergent when schemas share nothing',
      inputs: {
        schemaA: { projections: [billingProjection], properties: [urgencyProperty] },
        schemaB: { projections: [sentimentProjection], properties: [riskProperty] },
      },
      mocks: { callLlm: [divergentResponse] },
      want: {
        overlappingLengths: { projections: 0, properties: 0 },
        uniqueLengths: { projectionsA: 1, projectionsB: 1, propertiesA: 1, propertiesB: 1 },
      },
    },
    {
      name: 'handles empty projections and properties gracefully',
      inputs: {
        schemaA: { projections: [], properties: [] },
        schemaB: { projections: [], properties: [] },
      },
      mocks: { callLlm: [emptyResponse] },
      want: { overlappingLengths: { projections: 0 }, summary: 'Both schemas are empty.' },
    },
    {
      name: 'throws when schemas are missing projections or properties',
      inputs: { schemaA: {}, schemaB: {} },
      want: { throws: /must have projections and properties arrays/ },
    },
    {
      name: 'includes both schemas in the prompt',
      inputs: {
        schemaA: { projections: [billingProjection], properties: [] },
        schemaB: { projections: [sentimentProjection], properties: [] },
      },
      mocks: { callLlm: [promptResponse] },
      want: { promptContains: ['Schema A', 'Schema B', 'billing', 'sentiment'] },
    },
    {
      name: 'uses sem_compare jsonSchema for structured output',
      inputs: {
        schemaA: { projections: [], properties: [] },
        schemaB: { projections: [], properties: [] },
      },
      mocks: { callLlm: [blankResponse] },
      want: { schemaName: 'sem_compare', responseFormatDefined: true, temperature: 0 },
    },
    {
      name: 'propagates config through',
      inputs: {
        schemaA: { projections: [], properties: [] },
        schemaB: { projections: [], properties: [] },
        config: { traceId: 'compare-trace-1' },
      },
      mocks: { callLlm: [blankResponse] },
      want: { traceId: 'compare-trace-1' },
    },
    {
      name: 'formats property value ranges in the prompt',
      inputs: {
        schemaA: { projections: [], properties: [urgencyProperty] },
        schemaB: { projections: [], properties: [riskProperty] },
      },
      mocks: { callLlm: [comparedResponse] },
      want: { promptContains: ['urgency', 'continuous', 'riskLevel', 'categorical'] },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { callLlm });
    return compareSchemas(inputs.schemaA, inputs.schemaB ?? inputs.schemaA, inputs.config);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if (want.overlappingLengths) {
      const ol = want.overlappingLengths;
      if ('projections' in ol) {
        expect(result.projections.overlapping).toHaveLength(ol.projections);
      }
      if ('properties' in ol) {
        expect(result.properties.overlapping).toHaveLength(ol.properties);
      }
    }
    if (want.uniqueLengths) {
      const ul = want.uniqueLengths;
      if ('projectionsA' in ul) expect(result.projections.uniqueToA).toHaveLength(ul.projectionsA);
      if ('projectionsB' in ul) expect(result.projections.uniqueToB).toHaveLength(ul.projectionsB);
      if ('propertiesA' in ul) expect(result.properties.uniqueToA).toHaveLength(ul.propertiesA);
      if ('propertiesB' in ul) expect(result.properties.uniqueToB).toHaveLength(ul.propertiesB);
    }
    if (want.firstProjectionSimilarity) {
      expect(result.projections.overlapping[0].semanticSimilarity).toBe(
        want.firstProjectionSimilarity
      );
    }
    if (want.firstOverlappingNameA) {
      expect(result.projections.overlapping[0].nameA).toBe(want.firstOverlappingNameA);
    }
    if (want.uniqueAName) {
      expect(result.projections.uniqueToA[0].projectionName).toBe(want.uniqueAName);
    }
    if (want.uniqueBName) {
      expect(result.projections.uniqueToB[0].projectionName).toBe(want.uniqueBName);
    }
    if (want.uniqueAPropertyName) {
      expect(result.properties.uniqueToA[0].propertyName).toBe(want.uniqueAPropertyName);
    }
    if (want.uniqueBPropertyName) {
      expect(result.properties.uniqueToB[0].propertyName).toBe(want.uniqueBPropertyName);
    }
    if (want.summary) expect(result.summary).toBe(want.summary);
    if (want.promptContains) {
      const prompt = lastPrompt();
      for (const fragment of want.promptContains) expect(prompt).toContain(fragment);
    }
    if (want.schemaName) {
      expect(jsonSchema).toHaveBeenCalledWith(want.schemaName, expect.any(Object));
    }
    if (want.responseFormatDefined) expect(lastOptions().responseFormat).toBeDefined();
    if ('temperature' in want) expect(lastOptions().temperature).toBe(want.temperature);
    if (want.traceId) expect(lastOptions().traceId).toBe(want.traceId);
  },
});
