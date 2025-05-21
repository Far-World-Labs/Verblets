import { describe, expect, it } from 'vitest';

import { longTestTimeout } from '../../constants/common.js';
import chatGPT from '../../lib/chatgpt/index.js';
import { asJSONSchema } from '../../prompts/index.js';
import toObject from '../../verblets/to-object/index.js';

import list from './index.js';

const examples = [
  {
    inputs: { description: '2021 EV cars' },
    want: { minLength: 10, listContains: 'Model Y' },
  },
  {
    inputs: {
      description: '2021 EV cars',
      jsonSchemaQuery:
        'make, model, releaseDate (ISO),\
maxRange (miles), batteryCapacity (kWH), startingCost (USD)',
    },
    want: { minLength: 10, listModelContains: 'Model Y' },
  },
];

describe('List verblet', () => {
  examples.forEach((example) => {
    let jsonSchemaDisplay = '';
    if (example.inputs.jsonSchemaQuery) {
      const jsonSchemaEllipsis = example.inputs.jsonSchemaQuery.length > 10 ? '...' : '';
      jsonSchemaDisplay = ` - ${example.inputs.jsonSchemaQuery.slice(0, 10)}${jsonSchemaEllipsis}`;
    }
    it(
      `${example.inputs.description}${jsonSchemaDisplay}`,
      async () => {
        let schema;
        if (example.inputs.jsonSchemaQuery) {
          schema = await toObject(await chatGPT(asJSONSchema(example.inputs.jsonSchemaQuery)));
        }

        const result = await list(example.inputs.description, {
          schema,
        });

        if (example.want.minLength) {
          expect(result.length).gt(5);
        }

        if (example.want.listContains) {
          expect(result.some((item) => item.includes(example.want.listContains))).equals(true);
        }

        if (example.want.listModelContains) {
          expect(
            result.some((item) => {
              // Handle both string and object results
              if (typeof item === 'string') {
                return item.includes(example.want.listModelContains);
              }
              return item.model?.includes(example.want.listModelContains);
            })
          ).equals(true);
        }
      },
      longTestTimeout
    );
  });
});
