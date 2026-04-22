import { describe, expect, it, vi } from 'vitest';
import list, { generateList } from './index.js';

// Inline schema instead of loading from file for browser compatibility
const getSchema = () => ({
  type: 'object',
  properties: {
    make: { type: 'string' },
    model: { type: 'string' },
    releaseDate: { type: 'string', format: 'date-time' },
    maxRange: { type: 'number', description: 'Max range in miles' },
    batteryCapacity: { type: 'number', description: 'Battery capacity in kWh' },
    startingCost: { type: 'number', description: 'Starting cost in USD' },
  },
});

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/Transform/.test(text) && /Model Y/.test(text)) {
      return '{"make":"Tesla", "model": "Model Y"}';
    }
    if (/EV cars/.test(text)) {
      return { items: ['Tesla Model Y', 'Nissan Leaf', 'Chevy Bolt'] };
    }
    if (/climate change/.test(text)) {
      return {
        claims: [
          {
            id: 'c1',
            statement: 'Climate change is accelerating',
            type: 'factual',
            confidence: 'strong',
          },
        ],
        evidence: [
          {
            claimId: 'c1',
            content: 'Global temperatures rising',
            type: 'empirical',
            strength: 'strong',
          },
        ],
        counterarguments: [
          {
            targetClaimId: 'c1',
            statement: 'Natural cycles account for warming',
            type: 'alternative',
            strength: 'weak',
          },
        ],
      };
    }
    return 'undefined';
  }),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

const examples = [
  {
    name: 'Basic usage',
    inputs: { description: '2021 EV cars' },
    want: { listContains: /Model Y/ },
  },
  {
    name: 'Basic usage with schema',
    inputs: {
      description: '2021 EV cars',
      schema: getSchema,
    },
    want: { listModelContains: /Model Y/ },
  },
];

describe('List verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      let schema;
      if (example.inputs.schema) {
        schema = await example.inputs.schema();
      }
      const result = await list(example.inputs.description, {
        schema,
      });

      if (example.want.listContains) {
        expect(result.some((item) => example.want.listContains.test(item))).equals(true);
      }

      if (example.want.listModelContains) {
        expect(result.some((item) => example.want.listModelContains.test(item.model))).equals(true);
      }
    });
  });

  it('generateList shouldStop receives actual resultsAll in per-query check', async () => {
    const shouldStopSpy = vi.fn().mockImplementation(({ queryCount }) => {
      // Allow first query to complete, stop on second
      return queryCount > 1;
    });

    const results = [];
    for await (const item of generateList('2021 EV cars', { shouldStop: shouldStopSpy })) {
      results.push(item);
    }

    expect(results.length).toBeGreaterThan(0);

    // The per-query shouldStop call (result === undefined) should receive the actual resultsAll
    const perQueryCalls = shouldStopSpy.mock.calls.filter(
      ([factors]) => factors.result === undefined
    );
    expect(perQueryCalls.length).toBeGreaterThan(0);

    const firstPerQueryCall = perQueryCalls[0][0];
    expect(Array.isArray(firstPerQueryCall.resultsAll)).toBe(true);
    expect(firstPerQueryCall.resultsAll.length).toBeGreaterThan(0);
    expect(Array.isArray(firstPerQueryCall.resultsNew)).toBe(true);
    expect(firstPerQueryCall.resultsNew.length).toBeGreaterThan(0);
  });

  it('returns argument map structure when outputFormat is argument-map', async () => {
    const result = await list({
      text: 'Arguments about climate change',
      outputFormat: 'argument-map',
    });

    expect(result).toHaveProperty('claims');
    expect(result).toHaveProperty('evidence');
    expect(result).toHaveProperty('counterarguments');
    expect(Array.isArray(result.claims)).toBe(true);
    expect(result.claims).toHaveLength(1);
    expect(result.claims[0].statement).toMatch(/Climate change/);
    expect(result.evidence[0].claimId).toBe('c1');
    expect(result.counterarguments[0].targetClaimId).toBe('c1');
  });
});
