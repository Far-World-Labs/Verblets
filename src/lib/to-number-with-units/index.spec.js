import { expect } from 'vitest';
import toNumberWithUnits from './index.js';
import { runTable } from '../examples-runner/index.js';

runTable({
  describe: 'toNumberWithUnits',
  examples: [
    {
      name: 'parses a JSON object with value and unit',
      inputs: { input: '{"value": 42, "unit": "kg"}' },
      want: { value: { value: 42, unit: 'kg' } },
    },
    {
      name: 'parses string value by stripping numerics',
      inputs: { input: '{"value": "approximately 3.14", "unit": "meters"}' },
      want: { value: { value: 3.14, unit: 'meters' } },
    },
    {
      name: '"undefined" string → undefined',
      inputs: { input: 'undefined' },
      want: { value: undefined },
    },
    {
      name: 'missing unit → undefined unit',
      inputs: { input: '{"value": 100}' },
      want: { value: { value: 100, unit: undefined } },
    },
    {
      name: '"undefined" unit string → undefined unit',
      inputs: { input: '{"value": 7, "unit": "undefined"}' },
      want: { value: { value: 7, unit: undefined } },
    },
    {
      name: 'null value → undefined value',
      inputs: { input: '{"value": null, "unit": "km"}' },
      want: { value: { value: undefined, unit: 'km' } },
    },
    {
      name: 'strips LLM response wrapper before parsing',
      inputs: { input: 'Answer: {"value": 5, "unit": "seconds"}' },
      want: { value: { value: 5, unit: 'seconds' } },
    },
    {
      name: 'value string with no digits coerces to 0',
      inputs: { input: '{"value": "no-numbers-here", "unit": "kg"}' },
      want: { value: { value: 0, unit: 'kg' } },
    },
    {
      name: 'throws on non-JSON input',
      inputs: { input: 'not json at all' },
      want: { throws: 'LLM output [error]' },
    },
    {
      name: 'throws on unsupported value type',
      inputs: { input: '{"value": true, "unit": "kg"}' },
      want: { throws: 'Bad datatype' },
    },
  ],
  process: ({ inputs }) => toNumberWithUnits(inputs.input),
  expects: ({ result, error, want }) => {
    if ('throws' in want) {
      expect(error?.message).toContain(want.throws);
      return;
    }
    if (error) throw error;
    expect(result).toEqual(want.value);
  },
});
