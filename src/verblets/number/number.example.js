
import { describe, expect, it, vi } from 'vitest';

import number from './index.js';

const examples = [
  {
    inputs: { text: 'What is the height of Everest in feet' },
    want: { result: 29029 }
  }
  {
    inputs: { text: 'What is the length of the Nile in km' },
    want: { result: 29029 }
  }
];

describe('Number verblet', () => {
  examples.forEach((example) => {
    it(example.inputs.text, async () => {
      expect(await number(example.inputs.text))
        .toStrictEqual(example.want.result);
    });
  });
});
