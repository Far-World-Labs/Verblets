import { describe } from 'vitest';

import numberWithUnits from './index.js';

import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Number with units verblet');

const examples = [
  {
    inputs: { text: 'What is the height of Everest in feet' },
    want: { valueRange: [29000, 29100], unit: 'feet' },
  },
  {
    inputs: { text: 'What is my age in years' },
    want: { value: undefined, unit: 'years' },
  },
];

describe('Number with units verblet', () => {
  examples.forEach((example) => {
    it(example.inputs.text, async () => {
      const result = await numberWithUnits(example.inputs.text);

      if (example.want.value) {
        expect(result?.value).toStrictEqual(example.want.value);
      }
      if (example.want.valueRange) {
        expect(result?.value).toBeGreaterThanOrEqual(example.want.valueRange[0]);
        expect(result?.value).toBeLessThanOrEqual(example.want.valueRange[1]);
      }
      if (example.want.unit) {
        expect(result?.unit).toStrictEqual(example.want.unit);
      }
    });
  });
});
