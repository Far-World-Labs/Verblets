import { describe, expect, it, vi } from 'vitest';

import auto from './index.js';

const examples = [
  {
    inputs: { text: 'test' },
    want: { result: true }
  }
];

describe('Auto verblet', () => {
  examples.forEach((example) => {
    it(example.inputs.text, async () => {
      const result = await auto(example.inputs.text)

      if (example.want.typeOfResult) {
        expect(typeof result)
          .toStrictEqual(example.want.typeOfResult);
      }

      if (example.want.result) {
        expect(result)
          .toStrictEqual(example.want.result);
      }
    });
  });
});
