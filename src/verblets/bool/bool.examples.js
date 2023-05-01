import { describe, expect, it } from 'vitest';

import bool from './index.js';

const examples = [
  {
    inputs: { text: 'A hexagon has ten sides?' },
    want: { result: false },
  },
  {
    inputs: { text: 'A hexagon has six sides?' },
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
