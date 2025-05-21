import { describe, expect, it } from 'vitest';

import number from './index.js';
import { longTestTimeout } from '../../constants/common.js';

const examples = [
  {
    inputs: { text: 'What is the height of Everest in feet' },
    want: { resultRange: [29029, 29033] },
  },
  {
    inputs: { text: 'What is the length of the Nile in km' },
    want: { result: 6650 },
  },
  {
    inputs: { text: 'What is the my age in years' },
    want: { result: undefined },
  },
];

describe('Number verblet', () => {
  examples.forEach((example) => {
    it(
      example.inputs.text,
      async () => {
        if (example.want.resultRange) {
          const result = await number(example.inputs.text);
          expect(result).toBeGreaterThanOrEqual(example.want.resultRange[0]);
          expect(result).toBeLessThanOrEqual(example.want.resultRange[1]);
        } else {
          expect(await number(example.inputs.text)).toStrictEqual(example.want.result);
        }
      },
      longTestTimeout
    );
  });
});
