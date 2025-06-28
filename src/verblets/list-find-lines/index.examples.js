import { describe, expect, it } from 'vitest';
import listFind from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('list-find examples', () => {
  it(
    'finds the item that best fits the instructions',
    async () => {
      const books = ['space adventure', 'medieval romance', 'futuristic mystery'];
      const result = await listFind(books, 'which book sounds most futuristic?');
      expect(result).toBeDefined();
    },
    longTestTimeout
  );
});
