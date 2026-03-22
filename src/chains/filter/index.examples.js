import { describe } from 'vitest';
import filter from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Filter chain');

describe('filter examples', () => {
  it(
    'filters with listFilter',
    async () => {
      const notes = [
        'Saw a dolphin while surfing',
        'Finished laundry',
        'Dream of traveling to Iceland',
        'Paid the electricity bill',
      ];
      const dreams = await filter(notes, 'keep only lines about aspirations or dreams', {
        batchSize: 2,
      });
      expect(dreams.length).toBeGreaterThan(0);
      expect(dreams.length).toBeLessThan(notes.length);
      await aiExpect(dreams).toSatisfy(
        'contains only items about aspirations or dreams, not mundane tasks'
      );
    },
    longTestTimeout
  );
});
