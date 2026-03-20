import { describe } from 'vitest';

import auto from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

//
// Setup AI test wrappers
//
const { it, expect, aiExpect } = getTestHelpers('Auto verblet');

//
// Test suite
//

const examples = [
  {
    inputs: { text: 'test' },
    want: {
      typeOfResult: 'object',
      hasProperties: ['functionArgsAsArray'],
    },
  },
];

describe('Auto verblet', () => {
  examples.forEach((example) => {
    it(example.inputs.text, async () => {
      const result = await auto(example.inputs.text);

      if (example.want.typeOfResult) {
        expect(typeof result).toStrictEqual(example.want.typeOfResult);
      }

      if (example.want.hasProperties) {
        example.want.hasProperties.forEach((prop) => {
          expect(result).toHaveProperty(prop);
        });
      }
    });
  });
});
