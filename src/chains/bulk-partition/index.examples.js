import { describe, it, expect } from 'vitest';
import bulkPartition from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('bulk-partition examples', () => {
  it(
    'partitions a long list',
    async () => {
      const items = ['wolf', 'sparrow', 'eel', 'tiger'];
      const result = await bulkPartition(items, 'Is each creature terrestrial or aquatic?', {
        chunkSize: 2,
        topN: 2,
      });
      expect(result).toBeDefined();
    },
    longTestTimeout
  );
});
