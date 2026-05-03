import { vi } from 'vitest';
import numberWithUnits from './index.js';
import { runTable, equals } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn().mockImplementation((text) => {
    if (/Everest/.test(text)) return { value: 29029, unit: 'feet' };
    if (/speed of light/.test(text)) return { value: 299792458, unit: 'meters per second' };
    if (/temperature/.test(text)) return { value: 98.6, unit: 'Fahrenheit' };
    return { value: undefined, unit: undefined };
  }),
}));

const examples = [
  {
    name: 'extracts height measurement',
    inputs: 'What is the height of Everest in feet',
    check: equals({ value: 29029, unit: 'feet' }),
  },
  {
    name: 'extracts speed measurement',
    inputs: 'What is the speed of light in meters per second',
    check: equals({ value: 299792458, unit: 'meters per second' }),
  },
  {
    name: 'extracts temperature measurement',
    inputs: 'What is normal body temperature in Fahrenheit',
    check: equals({ value: 98.6, unit: 'Fahrenheit' }),
  },
];

runTable({
  describe: 'numberWithUnits',
  examples,
  process: (text) => numberWithUnits(text),
});
