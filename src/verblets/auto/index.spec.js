import { describe, expect, it, vi } from 'vitest';

import auto from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/prompt text to match/.test(text)) {
      return 'True';
    } else {
      return 'undefined';
    }
  }),
}));

const examples = [
  {
    name: 'Basic usage',
    inputs: { text: 'test' },
    want: { result: true }
  }
];

describe('Auto verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const result = await auto(example.inputs.text);

      if (example.want.typeOfResult) {
        expect(typeof result)
          .toStrictEqual(example.want.typeOfResult);
      }
    });
  });
});
