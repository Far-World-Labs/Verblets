import { describe, it, expect } from 'vitest';
import listMap from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('list-map examples', () => {
  it(
    'maps creative slogans',
    async () => {
      const items = ['smart toaster', 'robot vacuum'];
      const result = await listMap(items, 'Give a playful marketing slogan');
      expect(result.length).toBe(2);
    },
    longTestTimeout
  );
});
