import { describe, expect, it } from 'vitest';
import reduce from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('reduce examples', () => {
  it(
    'reduces a long list sequentially',
    async () => {
      const items = ['one', 'two', 'three', 'four'];
      const result = await reduce(items, 'concatenate', { chunkSize: 2 });
      expect(result).toBeDefined();
    },
    longTestTimeout
  );
});
