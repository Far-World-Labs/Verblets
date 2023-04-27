import Ajv from 'ajv';
import fs from 'fs/promises';
import { describe, expect, it } from 'vitest';

import { longTestTimeout } from '../../constants/common.js';
import schemaOrg from './index.js';

const resultSchemaWith = (type) => async () => {
  return JSON.parse(
    await fs.readFile(
      `./src/json-schemas/schema-dot-org-${type.toLowerCase()}.json`
    )
  );
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
        const result = await schemaOrg(
          example.inputs.text,
          example.inputs.type
        );

        if (example.want.resultSchema) {
          const schema = await example.want.resultSchema();
          const ajv = new Ajv();
          const validate = ajv.compile(schema);

          const isValid = validate(result);
          if (!isValid) {
            console.error('Validation errors:');
            console.error(JSON.stringify(validate.errors, null, 2));
            console.error('Returned result:');
            console.error(JSON.stringify(result, null, 2));
          }
          expect(isValid).toStrictEqual(true);
        }
      },
      longTestTimeout
    );
  });
});
