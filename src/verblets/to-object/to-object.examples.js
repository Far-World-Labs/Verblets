import { describe, expect, it } from 'vitest';

import toObject from './index.js';

const examples = [
  {
    inputs: { text: 'Describe SpaceX Starship' },
    want: { typeOfResult: 'object' },
  },
];

describe('To object verblet', () => {
  examples.forEach((example) => {
    it(example.inputs.text, async () => {
      const result = await toObject(example.inputs.text);

      if (example.want.typeOfResult) {
        expect(typeof result).toStrictEqual(example.want.typeOfResult);
      }
    });
  });
});
