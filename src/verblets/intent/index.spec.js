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

const operations = [{ name: 'search', description: 'Search for items' }];

describe('Intent verblet', () => {
  it('identifies operation and extracts parameters', async () => {
    const result = await intent('Give me a flight to Burgas', [
      {
        name: 'book_flight',
        description: 'Book a flight to a destination',
        parameters: {
          destination: { type: 'string', description: 'Destination city' },
        },
      },
    ]);
    expect(result).toStrictEqual({
      operation: 'book_flight',
      parameters: { destination: 'Burgas' },
      optional_parameters: {},
    });
  });

  testPromptShapingOption('tolerance', {
    invoke: (config) => intent('find stuff', operations, config),
    setupMocks: () => mockLlm.mockClear(),
    llmMock: mockLlm,
    markers: { low: 'strict', high: 'lenient' },
  });
});
