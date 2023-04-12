import { describe, expect, it, vi } from 'vitest';

import enumValue from './index.js';

vi.mock('../../lib/openai/completions.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/traffic light/.test(text)) {
      return 'red';
    } else {
      return 'undefined';
    }
  }),
}));

const examples = [
  {
    name: 'Basic usage',
    inputs: {
      text: 'What is the top color on a traffic light',
      enum: { green: 1, yellow: 1, red: 1, purple: 1 }
    },
    want: { result: 'red' }
  }
];

describe('Enum verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const result = await enumValue(
        example.inputs.text,
        example.inputs.enum
      );

      if (example.want.result) {
        expect(result)
          .toStrictEqual(example.want.result);
      }
    });
  });
});
