import { describe, expect, it } from 'vitest';

import toObject from './index.js';
import chatGPT from '../../lib/chatgpt/index.js';
import { longTestTimeout } from '../../constants/common.js';

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
        const chatGPTResult = await chatGPT(example.inputs.text);
        const result = await toObject(chatGPTResult);

        if (example.want.typeOfResult) {
          expect(typeof result).toStrictEqual(example.want.typeOfResult);
        }
      },
      longTestTimeout
    );
  });
});
