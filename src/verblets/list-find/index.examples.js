import { describe, it, expect } from 'vitest';
import listFind from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('list-find examples', () => {
  it(
    'finds a matching item',
    async () => {
      const adventures = ['Backpacking through Patagonia', 'A weekend in Paris', 'Safari in Kenya'];
      const result = await listFind(adventures, 'takes place in South America');
      expect(result).toBeDefined();
    },
    longTestTimeout
  );
});
