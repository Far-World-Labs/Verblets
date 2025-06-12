import { describe, expect, it } from 'vitest';
import bulkFilter from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('bulk-filter examples', () => {
  it(
    'filters with listFilter',
    async () => {
      const notes = [
        'Saw a dolphin while surfing',
        'Finished laundry',
        'Dream of traveling to Iceland',
        'Paid the electricity bill',
      ];
      const dreams = await bulkFilter(notes, 'keep only lines about aspirations or dreams', {
        chunkSize: 2,
      });
      expect(dreams.length).toBeGreaterThan(0);
    },
    longTestTimeout
  );
});
