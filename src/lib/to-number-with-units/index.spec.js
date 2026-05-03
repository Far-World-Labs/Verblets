import toNumberWithUnits from './index.js';
import { runTable } from '../examples-runner/index.js';

const examples = [
  {
    name: 'parses a JSON object with value and unit',
    inputs: '{"value": 42, "unit": "kg"}',
    want: { value: 42, unit: 'kg' },
  },
  {
    name: 'parses string value by stripping numerics',
    inputs: '{"value": "approximately 3.14", "unit": "meters"}',
    want: { value: 3.14, unit: 'meters' },
  },
  { name: '"undefined" string → undefined', inputs: 'undefined', want: undefined },
  {
    name: 'missing unit → undefined unit',
    inputs: '{"value": 100}',
    want: { value: 100, unit: undefined },
  },
  {
    name: '"undefined" unit string → undefined unit',
    inputs: '{"value": 7, "unit": "undefined"}',
    want: { value: 7, unit: undefined },
  },
  {
    name: 'null value → undefined value',
    inputs: '{"value": null, "unit": "km"}',
    want: { value: undefined, unit: 'km' },
  },
  {
    name: 'strips LLM response wrapper before parsing',
    inputs: 'Answer: {"value": 5, "unit": "seconds"}',
    want: { value: 5, unit: 'seconds' },
  },
  {
    name: 'value string with no digits coerces to 0',
    inputs: '{"value": "no-numbers-here", "unit": "kg"}',
    want: { value: 0, unit: 'kg' },
  },
  {
    name: 'throws on non-JSON input',
    inputs: 'not json at all',
    want: { throws: 'LLM output [error]' },
  },
  {
    name: 'throws on unsupported value type',
    inputs: '{"value": true, "unit": "kg"}',
    want: { throws: 'Bad datatype' },
  },
];

runTable({
  describe: 'toNumberWithUnits',
  examples,
  process: (input) => toNumberWithUnits(input),
});
