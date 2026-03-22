import { describe } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import categorySamples from './index.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Category-samples chain');

describe('Category Samples Chain', () => {
  it(
    'generates contextual seed items with diversity control',
    async () => {
      const seeds = await categorySamples('bird', {
        context: 'Common backyard birds in North America',
        count: 4,
        diversity: 'low',
      });

      expect(seeds).toHaveLength(4);
      expect(seeds.every((seed) => typeof seed === 'string')).toBe(true);

      await aiExpect(seeds).toSatisfy(
        'Are these reasonable names of common backyard birds that would be found in North America?'
      );
    },
    longTestTimeout
  );

  it('throws error for invalid category name', async () => {
    await expect(categorySamples('')).rejects.toThrow('categoryName must be a non-empty string');
    await expect(categorySamples(null)).rejects.toThrow('categoryName must be a non-empty string');
  });
});
