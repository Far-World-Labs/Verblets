import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';

import { longTestTimeout } from '../../constants/common.js';
import { schemaOrgSchemas } from '../../json-schemas/index.js';
import schemaOrg from './index.js';
import { debug } from '../../lib/debug/index.js';

const resultSchemaWith = (type) => () => {
  return schemaOrgSchemas[type.toLowerCase()];
};

const examples = [
  {
    inputs: { text: 'Kyoto (location)' },
    want: { resultSchema: resultSchemaWith('Place') },
  },
  {
    inputs: { text: 'Kyoto (location)', type: 'Photograph' },
    want: { resultSchema: resultSchemaWith('Photograph') },
  },
];

describe('Schema.org verblet', () => {
  examples.forEach((example) => {
    const typeDisplay = example.inputs.type ? ` - ${example.inputs.type}` : '';
    it(
      `${example.inputs.text}${typeDisplay}`,
      async () => {
        const result = await schemaOrg(example.inputs.text, example.inputs.type);

        if (example.want.resultSchema) {
          const schema = await example.want.resultSchema();
          const ajv = new Ajv();
          const validate = ajv.compile(schema);

          const isValid = validate(result);
          if (!isValid) {
            debug('Validation errors:');
            debug(JSON.stringify(validate.errors, null, 2));
            debug('Returned result:');
            debug(JSON.stringify(result, null, 2));
          }
          expect(isValid).toStrictEqual(true);
        }
      },
      longTestTimeout
    );
  });
});
