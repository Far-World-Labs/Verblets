import { describe, expect, it } from 'vitest';

import { longTestTimeout } from '../../constants/common.js';
import chatGPT from '../../lib/openai/completions.js';
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
      const jsonSchemaEllipsis =
        example.inputs.jsonSchemaQuery.length > 10 ? '...' : '';
      jsonSchemaDisplay = ` - ${example.inputs.jsonSchemaQuery.slice(
        0,
        10
      )}${jsonSchemaEllipsis}`;
    }
    it(
      `${example.inputs.text}${jsonSchemaDisplay}`,
      async () => {
        let jsonSchema;
        if (example.inputs.jsonSchemaQuery) {
          jsonSchema = await toObject(
            await chatGPT(asJSONSchema(example.inputs.jsonSchemaQuery))
          );
        }

        const result = await list(example.inputs.description, {
          jsonSchema,
        });

        if (example.want.minLength) {
          expect(result.length).gt(5);
        }

        if (example.want.listContains) {
          expect(
            result.some((item) => item.includes(example.want.listContains))
          ).equals(true);
        }

        if (example.want.listModelContains) {
          expect(
            result.some((item) =>
              item.model.includes(example.want.listModelContains)
            )
          ).equals(true);
        }
      },
      longTestTimeout
    );
  });
});
