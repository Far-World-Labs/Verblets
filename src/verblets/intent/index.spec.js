import { describe, expect, it, vi } from 'vitest';

import intent, { mapTolerance } from './index.js';

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

describe('mapTolerance', () => {
  it('returns undefined when undefined', () => {
    expect(mapTolerance(undefined)).toBeUndefined();
  });

  it('maps low to strict matching guidance', () => {
    const guidance = mapTolerance('low');
    expect(guidance).toContain('strict');
    expect(guidance).toContain('null');
  });

  it('maps high to lenient matching guidance', () => {
    const guidance = mapTolerance('high');
    expect(guidance).toContain('lenient');
    expect(guidance).toContain('Infer reasonable parameter values');
  });

  it('returns undefined on unknown string', () => {
    expect(mapTolerance('extreme')).toBeUndefined();
  });
});

describe('Intent verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const result = await intent(example.inputs.text, example.inputs.operations);
      if (example.want.typeOfResult) {
        expect(typeof result).toStrictEqual(example.want.typeOfResult);
      }
    });
  });

  it('injects low tolerance guidance into prompt', async () => {
    const operations = [{ name: 'search', description: 'Search for items' }];
    await intent('find stuff', operations, { tolerance: 'low' });

    const prompt = mockLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('strict');
    expect(prompt).toContain('null');
  });

  it('injects high tolerance guidance into prompt', async () => {
    const operations = [{ name: 'search', description: 'Search for items' }];
    await intent('find stuff', operations, { tolerance: 'high' });

    const prompt = mockLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('lenient');
    expect(prompt).toContain('Infer reasonable parameter values');
  });

  it('omits tolerance guidance when not specified', async () => {
    const operations = [{ name: 'search', description: 'Search for items' }];
    await intent('find stuff', operations);

    const prompt = mockLlm.mock.calls.at(-1)[0];
    expect(prompt).not.toContain('strict about matching');
    expect(prompt).not.toContain('lenient about matching');
  });
});
