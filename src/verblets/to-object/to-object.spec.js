import { describe, expect, it, vi } from 'vitest';

import toObject from './index.js';

vi.mock('../../lib/openai/completions.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/test/.test(text)) {
      return '{}';
    } else {
      return 'undefined';
    }
  }),
}));

const examples = [
  {
    name: 'Basic usage',
    inputs: { text: 'test' },
    want: { typeOfResult: 'object' }
  }
];

describe('To object verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const result = await toObject(example.inputs.text);

      if (example.want.typeOfResult) {
        expect(typeof result)
          .toStrictEqual(example.want.typeOfResult);
      }
    });
  });
});
