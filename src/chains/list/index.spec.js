import { vi, expect } from 'vitest';
import list, { generateList } from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

const evSchema = {
  type: 'object',
  properties: {
    make: { type: 'string' },
    model: { type: 'string' },
    releaseDate: { type: 'string', format: 'date-time' },
    maxRange: { type: 'number', description: 'Max range in miles' },
    batteryCapacity: { type: 'number', description: 'Battery capacity in kWh' },
    startingCost: { type: 'number', description: 'Starting cost in USD' },
  },
};

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/Transform/.test(text) && /Tesla Model Y/.test(text)) {
      return '{"make":"Tesla", "model": "Model Y"}';
    }
    if (/Transform/.test(text) && /Nissan Leaf/.test(text)) {
      return '{"make":"Nissan", "model": "Leaf"}';
    }
    if (/Transform/.test(text) && /Chevy Bolt/.test(text)) {
      return '{"make":"Chevy", "model": "Bolt"}';
    }
    if (/EV cars/.test(text)) {
      return { items: ['Tesla Model Y', 'Nissan Leaf', 'Chevy Bolt'] };
    }
    return 'undefined';
  }),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

runTable({
  describe: 'List verblet',
  examples: [
    {
      name: 'Basic usage',
      inputs: { description: '2021 EV cars' },
      want: { someItemMatches: /Model Y/ },
    },
    {
      name: 'Basic usage with schema',
      inputs: { description: '2021 EV cars', schema: evSchema },
      want: { someModelMatches: /Model Y/ },
    },
    {
      name: 'generateList shouldStop receives actual resultsAll in per-query check',
      inputs: { useGenerator: true },
      want: { generatorPerQueryShape: true },
    },
  ],
  process: async ({ inputs }) => {
    if (inputs.useGenerator) {
      const shouldStopSpy = vi.fn(({ queryCount }) => queryCount > 1);
      const results = [];
      for await (const item of generateList('2021 EV cars', { shouldStop: shouldStopSpy })) {
        results.push(item);
      }
      return { results, shouldStopSpy };
    }
    return list(inputs.description, { schema: inputs.schema });
  },
  expects: ({ result, want }) => {
    if (want.someItemMatches) {
      expect(result.some((item) => want.someItemMatches.test(item))).toBe(true);
    }
    if (want.someModelMatches) {
      expect(result.some((item) => want.someModelMatches.test(item.model))).toBe(true);
    }
    if (want.generatorPerQueryShape) {
      expect(result.results.length).toBeGreaterThan(0);
      const perQueryCalls = result.shouldStopSpy.mock.calls.filter(
        ([factors]) => factors.result === undefined
      );
      expect(perQueryCalls.length).toBeGreaterThan(0);
      const first = perQueryCalls[0][0];
      expect(Array.isArray(first.resultsAll)).toBe(true);
      expect(first.resultsAll.length).toBeGreaterThan(0);
      expect(Array.isArray(first.resultsNew)).toBe(true);
      expect(first.resultsNew.length).toBeGreaterThan(0);
    }
  },
});
