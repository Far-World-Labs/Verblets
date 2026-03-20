import { describe } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import { dismantle } from './index.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect } = getTestHelpers('Dismantle chain (basic)');

const examples = [
  {
    name: 'Basic usage',
    inputs: { text: 'test' },
    want: { result: {} },
  },
];

describe('Dismantle chain', () => {
  examples.forEach((example) => {
    it(
      example.name,
      async () => {
        const result = await dismantle(example.inputs.text);

        if (example.want.typeOfResult) {
          expect(JSON.stringify(result.tree)).toStrictEqual(JSON.stringify(example.want.result));
        }
      },
      longTestTimeout
    );
  });
});
