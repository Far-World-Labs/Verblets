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

const lastPrompt = () => callLlm.mock.calls.at(-1)[0];
const lastOptions = () => callLlm.mock.calls.at(-1)[1];

runTable({
  describe: 'refine',
  examples: [
    {
      name: 'returns a revised schema with new projections and properties',
      inputs: {},
      check: ({ result }) => {
        expect(result.projections).toHaveLength(3);
        expect(result.projections.map((p) => p.projectionName)).toContain('launchExposure');
        expect(result.properties).toHaveLength(2);
        expect(result.properties.map((p) => p.propertyName)).toContain('launchCriticality');
      },
    },
    {
      name: 'does not include _poles in the returned schema',
      inputs: {},
      check: ({ result }) => expect(result._poles).toBeUndefined(),
    },
    {
      name: 'passes current schema into the prompt',
      inputs: {},
      check: () => {
        const prompt = lastPrompt();
        expect(prompt).toContain('billing');
        expect(prompt).toContain('compliance');
        expect(prompt).toContain('urgency');
      },
    },
    {
      name: 'passes study set details into the prompt',
      inputs: {},
      check: () => {
        const prompt = lastPrompt();
        expect(prompt).toContain('ticket:4812');
        expect(prompt).toContain('ticket:4921');
        expect(prompt).toContain('ticket:4993');
        expect(prompt).toContain('cluster together but current properties do not explain why');
      },
    },
    {
      name: 'includes property weights and ranges in the prompt',
      inputs: {},
      check: () => {
        const prompt = lastPrompt();
        expect(prompt).toContain('not urgent');
        expect(prompt).toContain('critical');
        expect(prompt).toContain('billing:0.3');
      },
    },
    {
      name: 'propagates config to callLlm',
      inputs: { config: { traceId: 'trace-xyz' } },
      check: () => expect(lastOptions().traceId).toBe('trace-xyz'),
    },
  ],
  process: ({ config }) => refine({ schema: existingSchema, studySet }, config),
});
