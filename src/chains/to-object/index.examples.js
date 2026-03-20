import { describe } from 'vitest';

import toObject from './index.js';
import llm from '../../lib/llm/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect } = getTestHelpers('To-object chain');

const examples = [
  {
    inputs: { text: 'Describe SpaceX Starship' },
    want: { typeOfResult: 'object' },
  },
];

describe('To object verblet', () => {
  examples.forEach((example) => {
    it(
      example.inputs.text,
      async () => {
        const llmResult = await llm(example.inputs.text);
        const result = await toObject(llmResult);

        if (example.want.typeOfResult) {
          expect(typeof result).toStrictEqual(example.want.typeOfResult);
        }
      },
      longTestTimeout
    );
  });
});
