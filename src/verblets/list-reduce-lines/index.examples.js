import { describe, expect, it } from 'vitest';
import listReduce from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('list-reduce examples', () => {
  it(
    'combines items with custom instructions',
    async () => {
      const result = await listReduce('', ['red', 'green', 'blue'], 'join with commas');
      expect(result.length).toBeGreaterThan(0);
    },
    longTestTimeout
  );
});
