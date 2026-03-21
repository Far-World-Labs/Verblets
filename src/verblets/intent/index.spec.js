import { describe, expect, it, vi } from 'vitest';

import intent from './index.js';
import { testPromptShapingOption } from '../../lib/test-utils/index.js';

vi.mock('../../lib/llm/index.js', () => ({
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

const mockLlm = (await import('../../lib/llm/index.js')).default;

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

const operations = [{ name: 'search', description: 'Search for items' }];

describe('Intent verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const result = await intent(example.inputs.text, example.inputs.operations);
      if (example.want.typeOfResult) {
        expect(typeof result).toStrictEqual(example.want.typeOfResult);
      }
    });
  });

  testPromptShapingOption('tolerance', {
    invoke: (config) => intent('find stuff', operations, config),
    setupMocks: () => mockLlm.mockClear(),
    llmMock: mockLlm,
    markers: { low: 'strict', high: 'lenient' },
  });
});
