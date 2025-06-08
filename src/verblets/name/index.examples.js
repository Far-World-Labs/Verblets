import { describe, it, expect } from 'vitest';
import name from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('name examples', () => {
  it(
    'suggests titles',
    async () => {
      const result = await name('Collection of recipes from my grandmother');
      expect(typeof result).toBe('string');
    },
    longTestTimeout
  );
});
