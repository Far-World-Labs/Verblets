import { describe, expect, it, vi } from 'vitest';

import intent from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/a flight to/.test(text)) {
      return {
        operation: 'book_flight',
        parameters: { destination: 'Burgas' },
        optional_parameters: {},
      };
    }
    return {};
  }),
}));

const examples = [
  {
    name: 'Basic usage',
    inputs: {
      text: 'Give me a flight to Burgas',
      operations: [
        {
          name: 'book_flight',
          description: 'Book a flight to a destination',
          parameters: {
            destination: { type: 'string', description: 'Destination city' },
          },
        },
      ],
    },
    want: { typeOfResult: 'object' },
  },
];

describe('Intent verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const result = await intent(example.inputs.text, example.inputs.operations);
      if (example.want.typeOfResult) {
        expect(typeof result).toStrictEqual(example.want.typeOfResult);
      }
    });
  });
});
