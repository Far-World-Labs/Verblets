import { describe } from 'vitest';

import enumValue from './index.js';

import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

//
// Setup AI test wrappers
//
const { it, expect, aiExpect } = getTestHelpers('Enum verblet');

//
// Test suite
//

const examples = [
  {
    inputs: {
      text: 'What is the top color on a traffic light',
      enum: { green: 1, yellow: 1, red: 1, purple: 1 },
    },
    want: { result: 'red' },
  },
];

describe('Enum verblet', () => {
  examples.forEach((example) => {
    it(example.inputs.text, async () => {
      const result = await enumValue(example.inputs.text, example.inputs.enum);

      if (example.want.result) {
        expect(result).toStrictEqual(example.want.result);
      }
    });
  });
});
