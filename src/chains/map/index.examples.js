import { describe, expect, it } from 'vitest';
import map from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('map examples', () => {
  it(
    'maps with listMap',
    async () => {
      const animals = ['dog', 'cat', 'cow', 'sheep', 'duck'];
      const result = await map(animals, 'Return the sound each animal makes', { chunkSize: 3 });
      // e.g. result[0] === 'bark'
      //      result[2] === 'moo'
      expect(result.length).toBe(5);
    },
    longTestTimeout
  );
});
