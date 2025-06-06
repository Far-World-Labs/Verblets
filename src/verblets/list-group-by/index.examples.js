import { describe, it, expect } from 'vitest';
import listGroupBy from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('list-group-by examples', () => {
  it(
    'groups diary entries by emotional tone',
    async () => {
      const diary = [
        'Lost my keys again on the way to work',
        'Just booked tickets to see my favorite band',
        'Spilled coffee all over the car seat',
        'Adopted the sweetest puppy today',
      ];
      const result = await listGroupBy(
        diary,
        'Group each entry by the emotion it conveys (joy, frustration, etc.)'
      );
      expect(result).toBeDefined();
    },
    longTestTimeout
  );
});
