import { describe, expect, it, vi } from 'vitest';

import intent from './index.js';

vi.mock('../../lib/openai/completions.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/a flight to/.test(text)) {
      return '{}';
    } else {
      return 'undefined';
    }
  }),
}));

const examples = [
  {
    name: 'Basic usage',
    inputs: { text: 'Give me a flight to Burgas' },
    want: { typeOfResult: 'object' }
  }
];

describe('Intent verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const result = await intent(example.inputs.text);

      if (example.want.typeOfResult) {
        expect(typeof result)
          .toStrictEqual(example.want.typeOfResult);
      }
    });
  });
});
