import { describe, expect, it } from 'vitest';

import enumValue from './index.js';

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
