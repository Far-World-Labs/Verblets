import { describe } from 'vitest';

import { longTestTimeout, extendedTestTimeout } from '../../constants/common.js';
import llm from '../../lib/llm/index.js';
import { asJSONSchema } from '../../prompts/index.js';
import toObject from '../to-object/index.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

import list from './index.js';

const { it, expect, aiExpect } = getTestHelpers('List chain');

const examples = [
  {
    inputs: { description: '2021 EV cars' },
    want: {
      minLength: 10,
      listContainsAny: ['Model Y', 'Model 3', 'Tesla', 'Mustang Mach-E', 'ID.4', 'Bolt'],
    },
  },
  {
    inputs: {
      description: '2021 EV cars',
      jsonSchemaQuery:
        'make, model, releaseDate (ISO),\
maxRange (miles), batteryCapacity (kWH), startingCost (USD)',
    },
    want: {
      minLength: 10,
      listModelContainsAny: ['Model Y', 'Model 3', 'Tesla', 'Mustang Mach-E', 'ID.4', 'Bolt'],
    },
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
          schema = await toObject(await llm(asJSONSchema(example.inputs.jsonSchemaQuery)));
        }

        const result = await list(example.inputs.description, {
          schema,
        });

        if (example.want.minLength) {
          expect(result.length).gt(5);
        }

        if (example.want.listContainsAny) {
          const found = example.want.listContainsAny.some((needle) =>
            result.some((item) => item.toLowerCase().includes(needle.toLowerCase()))
          );
          expect(found).equals(true);
          await aiExpect(result).toSatisfy('a list of 2021 electric vehicles');
        }

        if (example.want.listModelContainsAny) {
          const found = example.want.listModelContainsAny.some((needle) =>
            result.some((item) => {
              const str = typeof item === 'string' ? item : item.model || item.make || '';
              return str.toLowerCase().includes(needle.toLowerCase());
            })
          );
          expect(found).equals(true);
        }
      },
      example.inputs.jsonSchemaQuery ? extendedTestTimeout : longTestTimeout
    );
  });
});
