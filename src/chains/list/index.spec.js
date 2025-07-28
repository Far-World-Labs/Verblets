import { describe, expect, it, vi } from 'vitest';
import list from './index.js';

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

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/Transform/.test(text) && /Model Y/.test(text)) {
      return '{"make":"Tesla", "model": "Model Y"}';
    }
    if (/EV cars/.test(text)) {
      return '["Tesla Model Y"]';
    }
    return 'undefined';
  }),
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
        shouldStop: ({ queryCount }) => queryCount > 1,
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
});
