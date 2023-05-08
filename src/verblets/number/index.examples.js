import { describe, expect, it } from 'vitest';

import number from './index.js';
import { longTestTimeout } from '../../constants/common.js';

const examples = [
  {
    inputs: { text: 'What is the height of Everest in feet' },
    want: { result: 29029 },
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
        expect(await number(example.inputs.text)).toStrictEqual(
          example.want.result
        );
      },
      longTestTimeout
    );
  });
});
