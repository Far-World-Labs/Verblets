import { describe, expect, it } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import { dismantle } from './index.js';

const examples = [
  {
    name: 'Basic usage',
    inputs: { text: 'test' },
    want: { result: {} },
  },
];

describe('Dismantle chain', () => {
  examples.forEach((example) => {
    it(
      example.name,
      async () => {
        const result = await dismantle(example.inputs.text);

        if (example.want.typeOfResult) {
          expect(JSON.stringify(result.tree)).toStrictEqual(JSON.stringify(example.want.result));
        }
      },
      longTestTimeout
    );
  });
});
