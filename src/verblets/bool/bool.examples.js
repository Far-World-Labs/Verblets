import { describe, expect, it, vi } from 'vitest';

import bool from './index.js';

const examples = [
  {
    inputs: { text: 'Does Mace Windu have a blue lightsaber' },
    want: { result: false }
  },
  {
    inputs: { text: 'Does Mace Windu have a purple lightsaber' },
    want: { result: true }
  }
];

describe('Bool verblet', () => {
  examples.forEach((example) => {
    it(`${example.inputs.text}`, async () => {
      expect(await bool(example.inputs.text))
        .toStrictEqual(example.want.result);
    });
  });
});