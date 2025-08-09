import Ajv from 'ajv';
import { describe, expect as vitestExpect, it as vitestIt, afterAll } from 'vitest';

import { longTestTimeout } from '../../constants/common.js';
import { schemaOrgSchemas } from '../../json-schemas/index.js';
import schemaOrg from './index.js';
import { debug } from '../../lib/debug/index.js';
import vitestAiExpect from '../../chains/expect/index.js';
import { logSuiteEnd } from '../../chains/test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../../chains/test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../../chains/test-analysis/config.js';

//
// Setup AI test wrappers
//
const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Schema.org verblet' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Schema.org verblet' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Schema.org verblet' } })
  : vitestAiExpect;
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

//
// Test suite
//
afterAll(async () => {
  await suiteLogEnd('Schema.org verblet', extractFileContext(2));
});

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
