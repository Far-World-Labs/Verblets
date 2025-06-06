import { describe, it, expect } from 'vitest';
import bulkGroupBy from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('bulk-group-by examples', () => {
  it(
    'groups diary entries in batches by emotion',
    async () => {
      const diary = [
        'Lost my keys again on the way to work',
        'Just booked tickets to see my favorite band',
        'Spilled coffee all over the car seat',
        'Adopted the sweetest puppy today',
      ];
      const result = await bulkGroupBy(
        diary,
        'Group each entry by the emotion it conveys (joy, frustration, etc.)',
        { chunkSize: 2 }
      );
      expect(result).toBeDefined();
    },
    longTestTimeout
  );
});
