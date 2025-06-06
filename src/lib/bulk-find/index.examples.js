import { describe, it, expect } from 'vitest';
import { bulkFindRetry } from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('bulk-find examples', () => {
  it(
    'finds an item across batches',
    async () => {
      const diaryEntries = [
        'Hiked up the mountains today and saw breathtaking views',
        'Visited the local market and tried a spicy stew',
        'Spotted penguins playing on the beach this morning',
      ];
      const result = await bulkFindRetry(diaryEntries, 'mentions penguins');
      expect(result).toBeDefined();
    },
    longTestTimeout
  );
});
