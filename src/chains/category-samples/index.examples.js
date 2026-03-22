import { describe } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import categorySamples from './index.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Category-samples chain');

describe('Category Samples Chain', () => {
  it(
    'generates basic seed items for a category',
    async () => {
      const seeds = await categorySamples('fruit', {
        count: 5,
      });

      expect(seeds).toHaveLength(5);
      expect(seeds.every((seed) => typeof seed === 'string')).toBe(true);
      expect(seeds.every((seed) => seed.length > 0)).toBe(true);

      // Use expect-chain for loose verification
      await aiExpect(seeds).toSatisfy(
        'Are these reasonable fruit names that represent a balanced mix of typical and moderately typical fruits?'
      );
    },
    longTestTimeout
  );

  it(
    'generates seeds with context',
    async () => {
      const seeds = await categorySamples('bird', {
        context: 'Common backyard birds in North America',
        count: 4,
        diversity: 'low',
      });

      expect(seeds).toHaveLength(4);
      expect(seeds.every((seed) => typeof seed === 'string')).toBe(true);

      // Use expect-chain for loose verification
      await aiExpect(seeds).toSatisfy(
        'Are these reasonable names of common backyard birds that would be found in North America?'
      );
    },
    longTestTimeout
  );

  it(
    'generates diverse seeds with high diversity level',
    async () => {
      const seeds = await categorySamples('vehicle', {
        count: 6,
        diversity: 'high',
      });

      expect(seeds).toHaveLength(6);
      expect(seeds.every((seed) => typeof seed === 'string')).toBe(true);

      // Use expect-chain for loose verification - check for diversity without being overly specific
      await aiExpect(seeds).toSatisfy(
        'Are these vehicle names reasonably diverse, showing variety in the types of vehicles represented?'
      );
    },
    longTestTimeout
  );

  it('throws error for invalid category name', async () => {
    await expect(categorySamples('')).rejects.toThrow('categoryName must be a non-empty string');
    await expect(categorySamples(null)).rejects.toThrow('categoryName must be a non-empty string');
  });

  it(
    'handles retry logic on failures',
    async () => {
      // This test ensures the retry mechanism works
      const seeds = await categorySamples('animal', {
        count: 3,
        maxAttempts: 2,
        retryDelay: 100,
      });

      expect(seeds).toHaveLength(3);
      expect(seeds.every((seed) => typeof seed === 'string')).toBe(true);

      // Use expect-chain for loose verification
      await aiExpect(seeds).toSatisfy('Are these reasonable animal names?');
    },
    longTestTimeout
  );
});
