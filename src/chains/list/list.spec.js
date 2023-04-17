import fs from 'fs/promises';
import { describe, expect, it, vi } from 'vitest';

import toObject from '../../verblets/to-object/index.js';
import list from './index.js';

const loadSchema = async () => {
  const file = (await fs.readFile('./src/json-schemas/cars-test.json'))
        .toString();

  return toObject(file);
};

vi.mock('../../lib/openai/completions.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/Transform/.test(text) && /Model Y/.test(text)) {
      return '{"make":"Tesla", "model": "Model Y"}';
    } else if (/EV cars/.test(text)) {
      return '["Tesla Model Y"]';
    } else {
      return 'undefined';
    }
  }),
}));

const examples = [
  {
    name: 'Basic usage',
    inputs: { description: '2021 EV cars' },
    want: { listContains: 'Model Y' }
  },
  {
    name: 'Basic usage with schema',
    inputs: {
      description: '2021 EV cars',
      jsonSchema: loadSchema,
    },
    want: { listModelContains: 'Model Y' }
  }
];

describe('List verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      let jsonSchema;
      if (example.inputs.jsonSchema) {
        jsonSchema = await example.inputs.jsonSchema();
      }
      const result = await list(
        example.inputs.description,
        {
          jsonSchema
        }
      );

      if (example.want.listContains) {
        expect(result.some(item => item.includes(example.want.listContains))).equals(true);
      }

      if (example.want.listModelContains) {
        expect(
          result.some(
            item => item.model.includes(
              example.want.listModelContains
            )
          )
        ).equals(true);
      }
    });
  });
});
