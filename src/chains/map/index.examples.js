import { describe } from 'vitest';
import map from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Map chain');

describe('map examples', () => {
  it(
    'maps with listMap',
    async () => {
      const animals = ['dog', 'cat', 'cow', 'sheep', 'duck'];
      const result = await map(animals, 'Return the sound each animal makes', { batchSize: 3 });
      // e.g. result[0] === 'bark'
      //      result[2] === 'moo'
      expect(result.length).toBe(5);
      await aiExpect(result).toSatisfy(
        'each item is the sound the corresponding animal makes (e.g. bark, meow, moo, baa, quack)'
      );
    },
    longTestTimeout
  );
});
