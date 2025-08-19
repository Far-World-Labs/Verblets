import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import map from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { wrapIt, wrapExpect } from '../../chains/test-analysis/test-wrappers.js';
import { getConfig } from '../../chains/test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Map chain' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Map chain' } })
  : vitestExpect;

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
