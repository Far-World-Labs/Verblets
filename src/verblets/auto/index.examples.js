import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';

import auto from './index.js';
import vitestAiExpect from '../../chains/expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../../chains/test-analysis/test-wrappers.js';
import { getConfig } from '../../chains/test-analysis/config.js';

//
// Setup AI test wrappers
//
const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Auto verblet' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Auto verblet' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Auto verblet' } })
  : vitestAiExpect;

//
// Test suite
//

const examples = [
  {
    inputs: { text: 'test' },
    want: {
      typeOfResult: 'object',
      hasProperties: ['functionArgsAsArray'],
    },
  },
];

describe('Auto verblet', () => {
  examples.forEach((example) => {
    it(example.inputs.text, async () => {
      const result = await auto(example.inputs.text);

      if (example.want.typeOfResult) {
        expect(typeof result).toStrictEqual(example.want.typeOfResult);
      }

      if (example.want.hasProperties) {
        example.want.hasProperties.forEach((prop) => {
          expect(result).toHaveProperty(prop);
        });
      }
    });
  });
});
