import { expect } from 'vitest';
import toNumberWithUnits from './index.js';
import { runTable } from '../examples-runner/index.js';

runTable({
  describe: 'toNumberWithUnits',
  examples: [
    {
      name: 'parses a JSON object with value and unit',
      inputs: { input: '{"value": 42, "unit": "kg"}', want: { value: 42, unit: 'kg' } },
    },
    {
      name: 'parses string value by stripping numerics',
      inputs: {
        input: '{"value": "approximately 3.14", "unit": "meters"}',
        want: { value: 3.14, unit: 'meters' },
      },
    },
    { name: '"undefined" string → undefined', inputs: { input: 'undefined', want: undefined } },
    {
      name: 'missing unit → undefined unit',
      inputs: { input: '{"value": 100}', want: { value: 100, unit: undefined } },
    },
    {
      name: '"undefined" unit string → undefined unit',
      inputs: {
        input: '{"value": 7, "unit": "undefined"}',
        want: { value: 7, unit: undefined },
      },
    },
    {
      name: 'null value → undefined value',
      inputs: {
        input: '{"value": null, "unit": "km"}',
        want: { value: undefined, unit: 'km' },
      },
    },
    {
      name: 'strips LLM response wrapper before parsing',
      inputs: {
        input: 'Answer: {"value": 5, "unit": "seconds"}',
        want: { value: 5, unit: 'seconds' },
      },
    },
    {
      name: 'value string with no digits coerces to 0',
      inputs: {
        input: '{"value": "no-numbers-here", "unit": "kg"}',
        want: { value: 0, unit: 'kg' },
      },
    },
    {
      name: 'throws on non-JSON input',
      inputs: { input: 'not json at all', throws: 'LLM output [error]' },
    },
    {
      name: 'throws on unsupported value type',
      inputs: { input: '{"value": true, "unit": "kg"}', throws: 'Bad datatype' },
    },
  ],
  process: ({ input }) => toNumberWithUnits(input),
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toContain(inputs.throws);
      return;
    }
    if (error) throw error;
    expect(result).toEqual(inputs.want);
  },
});
