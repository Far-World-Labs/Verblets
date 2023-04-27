import Ajv from 'ajv';
import fs from 'fs/promises';
import { describe, expect, it } from 'vitest';

import { longTestTimeout } from '../../constants/common.js';
import intent from './index.js';

const resultSchema = async () => {
  return JSON.parse(await fs.readFile('./src/json-schemas/intent.json'));
};

const examples = [
  {
    inputs: { text: 'Give me a flight to Burgas' },
    want: { resultSchema },
  },
  {
    inputs: {
      text: 'Lookup a song by the quote \
"I just gotta tell you how I\'m feeling"',
    },
    want: { resultSchema },
  },
];

describe('Intent verblet', () => {
  examples.forEach((example) => {
    it(example.inputs.text, async () => {
      const result = await intent({ text: example.inputs.text });

      if (example.want.resultSchema) {
        const schema = await example.want.resultSchema();
        const ajv = new Ajv();
        const validate = ajv.compile(schema);

        const isValid = validate(result);
        if (!isValid) {
          console.error('Validation errors:');
          console.error(validate.errors);
          console.error('Returned result:');
          console.error(JSON.stringify(result, null, 2));
        }
        expect(isValid).toStrictEqual(true);
      }
    });
  }, longTestTimeout);
});
