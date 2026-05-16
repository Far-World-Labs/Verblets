import { vi, expect } from 'vitest';
import { runTable } from '../../lib/examples-runner/index.js';

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

vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn((fn) => fn()) }));

const { default: refine } = await import('./index.js');
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

runTable({
  describe: 'refine',
  examples: [
    {
      name: 'returns a revised schema with new projections and properties',
      inputs: {},
      want: {
        projectionsLength: 3,
        projectionsContain: 'launchExposure',
        propertiesLength: 2,
        propertiesContain: 'launchCriticality',
      },
    },
    { name: 'does not include _poles in the returned schema', inputs: {}, want: { noPoles: true } },
    {
      name: 'passes current schema into the prompt',
      inputs: {},
      want: { promptContains: ['billing', 'compliance', 'urgency'] },
    },
    {
      name: 'passes study set details into the prompt',
      inputs: {},
      want: {
        promptContains: [
          'ticket:4812',
          'ticket:4921',
          'ticket:4993',
          'cluster together but current properties do not explain why',
        ],
      },
    },
    {
      name: 'includes property weights and ranges in the prompt',
      inputs: {},
      want: { promptContains: ['not urgent', 'critical', 'billing:0.3'] },
    },
    {
      name: 'propagates config to callLlm',
      inputs: { config: { traceId: 'trace-xyz' } },
      want: { traceId: 'trace-xyz' },
    },
  ],
  process: ({ inputs }) => refine({ schema: existingSchema, studySet }, inputs.config),
  expects: ({ result, want }) => {
    if ('projectionsLength' in want) {
      expect(result.projections).toHaveLength(want.projectionsLength);
      expect(result.projections.map((p) => p.projectionName)).toContain(want.projectionsContain);
      expect(result.properties).toHaveLength(want.propertiesLength);
      expect(result.properties.map((p) => p.propertyName)).toContain(want.propertiesContain);
    }
    if (want.noPoles) expect(result._poles).toBeUndefined();
    if (want.promptContains) {
      const prompt = callLlm.mock.calls.at(-1)[0];
      for (const fragment of want.promptContains) expect(prompt).toContain(fragment);
    }
    if (want.traceId) {
      expect(callLlm.mock.calls.at(-1)[1].traceId).toBe(want.traceId);
    }
  },
});
