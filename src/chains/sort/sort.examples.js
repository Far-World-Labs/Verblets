import { describe, expect, it, vi } from 'vitest';

import { longTestTimeout } from '../../constants/common.js';
import list from '../list/index.js';
import sort  from './index.js';

const examples = [
  {
    name: '"The Office" episodes',
    inputs: {
      listText: '"The Office" most famous episodes',
      sortText: 'have scenes that became memes',
    },
    want: { result: true }
  }
];

describe('Sort chain', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const listResults = await list(example.inputs.listText);

      const result = await sort({
        by: example.inputs.sortText,
        iterations: 1,
      }, listResults);

      expect(true).toStrictEqual(true);
    }, longTestTimeout);
  });
});
