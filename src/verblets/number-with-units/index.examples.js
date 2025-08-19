import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';

import numberWithUnits from './index.js';
import vitestAiExpect from '../../chains/expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../../chains/test-analysis/test-wrappers.js';
import { getConfig } from '../../chains/test-analysis/config.js';

//
// Setup AI test wrappers
//
const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Number with units verblet' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Number with units verblet' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Number with units verblet' } })
  : vitestAiExpect;

//
// Test suite
//

const examples = [
  {
    inputs: { text: 'What is the height of Everest in feet' },
    want: { valueRange: [29029, 29032], unit: 'feet' },
  },
  {
    inputs: { text: 'What is my age in years' },
    want: { value: undefined, unit: 'years' },
  },
];

describe('Number with units verblet', () => {
  examples.forEach((example) => {
    it(
      example.inputs.text,
      async () => {
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
      },
      longTestTimeout
    );
  });
});
