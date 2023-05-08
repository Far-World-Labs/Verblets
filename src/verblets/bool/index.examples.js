import { describe, expect, it } from 'vitest';

import bool from './index.js';

const examples = [
  {
    inputs: { text: 'Does Mace Windu have a blue lightsaber?' },
    want: { result: false },
  },
  {
    inputs: { text: 'Does Mace Windu have a purple lightsaber?' },
    want: { result: true },
  },
];

describe('Bool verblet', () => {
  examples.forEach((example) => {
    it(`${example.inputs.text}`, async () => {
      const result = await bool(example.inputs.text);
      expect(result).toStrictEqual(example.want.result);
    });
  });
});
