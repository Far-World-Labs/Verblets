/**
 * Examples for centralTendency verblet
 * Demonstrates cognitive science applications in prototype theory and graded typicality
 */

import { describe } from 'vitest';
import centralTendency from './index.js';
import categorySamples from '../../chains/category-samples/index.js';
import centralTendencyChain from '../../chains/central-tendency/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect, makeLogger } = getTestHelpers('centralTendency examples');

describe('centralTendency examples', () => {
  it(
    'evaluates bird centrality with new config format',
    async () => {
      const birdSeeds = ['robin', 'sparrow', 'bluejay', 'cardinal'];

      const config = {
        context: 'Evaluate based on typical bird characteristics and behavior',
        coreFeatures: ['feathers', 'beak', 'lays eggs', 'flight'],
        logger: makeLogger('evaluates bird centrality'),
      };

      // Test prototypical bird
      const robinResult = await centralTendency('robin', birdSeeds, config);

      expect(robinResult).toHaveProperty('score');
      expect(robinResult).toHaveProperty('reason');
      expect(robinResult).toHaveProperty('confidence');
      expect(robinResult.score).toBeGreaterThanOrEqual(0.6); // Should be high centrality
      await aiExpect(robinResult).toSatisfy('a robin scored as a highly central/prototypical bird');

      // Test atypical but valid bird
      const penguinResult = await centralTendency('penguin', birdSeeds, config);
      expect(penguinResult.score).toBeGreaterThanOrEqual(0.3);
      expect(penguinResult.score).toBeLessThan(robinResult.score); // Should be lower than robin

      // Test non-bird that flies
      const batResult = await centralTendency('bat', birdSeeds, config);
      expect(batResult.score).toBeLessThan(0.4); // Should be low centrality
    },
    longTestTimeout
  );

  it(
    'compares natural vs artifact categories with fruit example',
    async () => {
      const fruitSeeds = ['apple', 'orange', 'banana', 'grape'];

      // Biological/botanical context
      const botanicalConfig = {
        context: 'Judge by botanical definition and structure',
        coreFeatures: ['seed-bearing', 'develops from flower', 'fleshy pericarp'],
      };

      // Culinary/folk context
      const culinaryConfig = {
        context: 'Judge by culinary use and folk categorization',
        coreFeatures: ['sweet taste', 'eaten fresh', 'dessert-like'],
      };

      const botanicalResult = await centralTendency('tomato', fruitSeeds, botanicalConfig);
      const culinaryResult = await centralTendency('tomato', fruitSeeds, culinaryConfig);

      expect(botanicalResult.score).toBeGreaterThan(culinaryResult.score);
    },
    longTestTimeout
  );

  it(
    'generates seeds with different diversity levels',
    async () => {
      // High diversity seeds
      const highDiversitySeeds = await categorySamples('animal', {
        context: 'Diverse animal kingdom representation across phyla',
        count: 6,
        diversity: 'high',
      });

      expect(Array.isArray(highDiversitySeeds)).toBe(true);
      expect(highDiversitySeeds.length).toBeGreaterThan(0);
      expect(highDiversitySeeds.length).toBeLessThanOrEqual(6);

      // Focused seeds
      const focusedSeeds = await categorySamples('bird', {
        context: 'Common backyard birds',
        count: 5,
        diversity: 'low',
      });

      expect(Array.isArray(focusedSeeds)).toBe(true);
      expect(focusedSeeds.length).toBeGreaterThan(0);
    },
    longTestTimeout
  );

  it(
    'processes bulk items with error handling',
    async () => {
      const mammalSeeds = ['dog', 'cat', 'horse', 'cow'];
      const testAnimals = ['wolf', 'tiger', 'elephant', 'whale', 'bat'];

      const config = {
        context: 'Mammalian characteristics and traits',
        coreFeatures: ['warm-blooded', 'hair/fur', 'mammary glands', 'live birth'],
        chunkSize: 3,
        maxAttempts: 2,
        logger: makeLogger('processes bulk items'),
      };

      const results = await centralTendencyChain(testAnimals, mammalSeeds, config);

      expect(results).toHaveLength(testAnimals.length);

      // Check that some results are valid (batch processing may lose items due to XML/JSON conflicts)
      const validResults = results.filter((r) => r !== undefined);
      expect(validResults.length).toBeGreaterThan(0);

      // Validate structure of valid results
      validResults.forEach((result) => {
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('reason');
        expect(result).toHaveProperty('confidence');
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    },
    longTestTimeout
  );
});
