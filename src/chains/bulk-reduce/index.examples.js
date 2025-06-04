import { describe, expect, it } from 'vitest';
import bulkReduce from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('bulk-reduce examples', () => {
  it(
    'reduces a long list sequentially',
    async () => {
      const items = ['one', 'two', 'three', 'four'];
      const result = await bulkReduce(items, 'concatenate', { chunkSize: 2 });
      expect(result).toBeDefined();
    },
    longTestTimeout
  );
});
