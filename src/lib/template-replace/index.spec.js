import { expect } from 'vitest';
import templateReplace from './index.js';
import { runTable } from '../examples-runner/index.js';

runTable({
  describe: 'templateReplace',
  examples: [
    {
      name: 'replaces single placeholder',
      inputs: { template: 'Hello {name}!', data: { name: 'World' }, want: 'Hello World!' },
    },
    {
      name: 'replaces multiple placeholders',
      inputs: {
        template: 'Hello {name}, you are {age} years old',
        data: { name: 'John', age: 30 },
        want: 'Hello John, you are 30 years old',
      },
    },
    {
      name: 'replaces repeated placeholders',
      inputs: {
        template: '{name} said "{name} is great"',
        data: { name: 'Alice' },
        want: 'Alice said "Alice is great"',
      },
    },
    {
      name: 'missing data → blank substitution',
      inputs: { template: 'Hello {name}!', data: {}, want: 'Hello !' },
    },
    {
      name: 'custom missing value substitutes',
      inputs: { template: 'Hello {name}!', data: {}, missing: 'UNKNOWN', want: 'Hello UNKNOWN!' },
    },
    {
      name: 'null value → blank',
      inputs: { template: 'Value: {value}', data: { value: null }, want: 'Value: ' },
    },
    {
      name: 'coerces non-string values',
      inputs: {
        template: 'Count: {count}, Active: {active}',
        data: { count: 42, active: true },
        want: 'Count: 42, Active: true',
      },
    },
    {
      name: 'no data → template unchanged',
      inputs: { template: 'Hello {name}!', want: 'Hello {name}!' },
    },
    {
      name: 'non-object data → template unchanged',
      inputs: { template: 'Hello {name}!', data: 'not an object', want: 'Hello {name}!' },
    },
    {
      name: 'empty template',
      inputs: { template: '', data: { name: 'test' }, want: '' },
    },
    {
      name: 'template with no placeholders',
      inputs: { template: 'Just plain text', data: { name: 'test' }, want: 'Just plain text' },
    },
  ],
  process: ({ template, data, missing }) => templateReplace(template, data, missing),
  expects: ({ result, inputs }) => expect(result).toEqual(inputs.want),
});
