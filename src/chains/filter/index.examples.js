import { describe, expect, it } from 'vitest';
import filter from './index.js';
import { longTestTimeout } from '../../constants/common.js';

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
        chunkSize: 2,
      });
      expect(dreams.length).toBeGreaterThan(0);
    },
    longTestTimeout
  );
});
