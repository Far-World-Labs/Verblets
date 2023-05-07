import { describe, expect, it } from 'vitest';

import searc from './index.js';

const examples = [
  {
    inputs: { text: 'test' },
    want: { result: true },
  },
];

describe('Scan JS repo with best-first search', () => {
  examples.forEach((example) => {
    it(example.inputs.text, async () => {
      const result = await searc(example.inputs.text);

      if (example.want.typeOfResult) {
        expect(typeof result).toStrictEqual(example.want.typeOfResult);
      }

      if (example.want.result) {
        expect(result).toStrictEqual(example.want.result);
      }
    });
  });
});
