import { vi, expect } from 'vitest';
import numberWithUnits from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn().mockImplementation((text) => {
    if (/Everest/.test(text)) return { value: 29029, unit: 'feet' };
    if (/speed of light/.test(text)) return { value: 299792458, unit: 'meters per second' };
    if (/temperature/.test(text)) return { value: 98.6, unit: 'Fahrenheit' };
    return { value: undefined, unit: undefined };
  }),
}));

runTable({
  describe: 'numberWithUnits',
  examples: [
    {
      name: 'extracts height measurement',
      inputs: { text: 'What is the height of Everest in feet' },
      want: { value: { value: 29029, unit: 'feet' } },
    },
    {
      name: 'extracts speed measurement',
      inputs: { text: 'What is the speed of light in meters per second' },
      want: { value: { value: 299792458, unit: 'meters per second' } },
    },
    {
      name: 'extracts temperature measurement',
      inputs: { text: 'What is normal body temperature in Fahrenheit' },
      want: { value: { value: 98.6, unit: 'Fahrenheit' } },
    },
  ],
  process: ({ inputs }) => numberWithUnits(inputs.text),
  expects: ({ result, want }) => expect(result).toEqual(want.value),
});
