import fs from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import toObject from '../to-object/index.js';
import list from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loadSchema = async () => {
  const file = (await fs.readFile(join(__dirname, '../../json-schemas/cars-test.json'))).toString();

  return toObject(file);
};

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
      schema: loadSchema,
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
