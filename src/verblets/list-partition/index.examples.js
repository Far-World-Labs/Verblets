import { describe, it, expect } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import listPartition from './index.js';

describe('list-partition examples', () => {
  it(
    'partitions a list into groups',
    async () => {
      const items = ['coffee', 'cake', 'juice', 'bread'];
      const result = await listPartition(items, 'Group as drinks or food', ['drink', 'food']);
      expect(result).toBeDefined();
    },
    longTestTimeout
  );
});
