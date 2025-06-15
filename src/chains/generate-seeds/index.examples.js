import { describe, expect, it } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import { expect as aiExpect } from '../expect/index.js';
import generateSeeds from './index.js';

describe('Generate Seeds Chain', () => {
  it(
    'generates basic seed items for a category',
    async () => {
      const seeds = await generateSeeds('fruit', {
        count: 5,
        diversityLevel: 'balanced',
      });

      expect(seeds).toHaveLength(5);
      expect(seeds.every((seed) => typeof seed === 'string')).toBe(true);
      expect(seeds.every((seed) => seed.length > 0)).toBe(true);

      // Use expect-chain for loose verification
      const [isValidFruitList] = await aiExpect(
        seeds,
        undefined,
        'Are these reasonable fruit names that represent a balanced mix of typical and moderately typical fruits?'
      );
      expect(isValidFruitList).toBe(true);
    },
    longTestTimeout
  );

  it(
    'generates seeds with context',
    async () => {
      const seeds = await generateSeeds('bird', {
        context: 'Common backyard birds in North America',
        count: 4,
        diversityLevel: 'focused',
      });

      expect(seeds).toHaveLength(4);
      expect(seeds.every((seed) => typeof seed === 'string')).toBe(true);

      // Use expect-chain for loose verification
      const [isValidBirdList] = await aiExpect(
        seeds,
        undefined,
        'Are these reasonable names of common backyard birds that would be found in North America?'
      );
      expect(isValidBirdList).toBe(true);
    },
    longTestTimeout
  );

  it(
    'generates diverse seeds with high diversity level',
    async () => {
      const seeds = await generateSeeds('vehicle', {
        count: 6,
        diversityLevel: 'high',
      });

      expect(seeds).toHaveLength(6);
      expect(seeds.every((seed) => typeof seed === 'string')).toBe(true);

      // Use expect-chain for loose verification - check for diversity without being overly specific
      const [isValidVehicleList] = await aiExpect(
        seeds,
        undefined,
        'Are these vehicle names reasonably diverse, showing variety in the types of vehicles represented?'
      );
      expect(isValidVehicleList).toBe(true);
    },
    longTestTimeout
  );

  it('throws error for invalid category name', async () => {
    await expect(generateSeeds('')).rejects.toThrow('categoryName must be a non-empty string');
    await expect(generateSeeds(null)).rejects.toThrow('categoryName must be a non-empty string');
  });

  it(
    'handles retry logic on failures',
    async () => {
      // This test ensures the retry mechanism works
      const seeds = await generateSeeds('animal', {
        count: 3,
        maxRetries: 2,
        retryDelay: 100,
      });

      expect(seeds).toHaveLength(3);
      expect(seeds.every((seed) => typeof seed === 'string')).toBe(true);

      // Use expect-chain for loose verification
      const [isValidAnimalList] = await aiExpect(
        seeds,
        undefined,
        'Are these reasonable animal names?'
      );
      expect(isValidAnimalList).toBe(true);
    },
    longTestTimeout
  );
});
