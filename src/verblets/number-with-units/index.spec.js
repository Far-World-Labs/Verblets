import { describe, expect, it, vi } from 'vitest';

import numberWithUnits from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/Everest/.test(text)) {
      return '{ "value": 29029, "unit": "feet" }';
    }
    return 'undefined';
  }),
}));

const examples = [
  {
    name: 'Basic usage',
    inputs: { text: 'What is the height of Everest in feet' },
    want: { value: 29029, unit: 'feet' },
  },
  {
    name: 'Unanswerable question',
    inputs: { text: 'What is my age in years' },
    want: { typeOfValue: 'undefined', typeOfUnit: 'undefined' },
  },
];

describe('Number with units verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const result = await numberWithUnits(example.inputs.text);
      if (example.want.value) {
        expect(result?.value).toStrictEqual(example.want.value);
      }
      if (example.want.typeOfValue) {
        expect(typeof result?.value).toStrictEqual(example.want.typeOfValue);
      }

      if (example.want.unit) {
        expect(result?.unit).toStrictEqual(example.want.unit);
      }
      if (example.want.typeOfValue) {
        expect(typeof result?.value).toStrictEqual(example.want.typeOfValue);
      }
    });
  });
});
