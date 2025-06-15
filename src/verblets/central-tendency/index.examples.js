/**
 * Examples for centralTendency verblet
 * Demonstrates cognitive science applications in prototype theory and graded typicality
 */

import { describe, expect, it } from 'vitest';
import centralTendency from './index.js';
import generateSeeds from '../../chains/generate-seeds/index.js';
import bulkCentralTendency from '../../chains/bulk-central-tendency/index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('centralTendency examples', () => {
  it(
    'evaluates bird centrality with new config format',
    async () => {
      const birdSeeds = ['robin', 'sparrow', 'bluejay', 'cardinal'];

      const config = {
        context: 'Evaluate based on typical bird characteristics and behavior',
        coreFeatures: ['feathers', 'beak', 'lays eggs', 'flight'],
      };

      // Test prototypical bird
      const robinResult = await centralTendency('robin', birdSeeds, config);
      expect(robinResult).toHaveProperty('score');
      expect(robinResult).toHaveProperty('reason');
      expect(robinResult).toHaveProperty('confidence');
      expect(robinResult.score).toBeGreaterThanOrEqual(0.7); // Should be high centrality

      // Test atypical but valid bird
      const penguinResult = await centralTendency('penguin', birdSeeds, config);
      expect(penguinResult.score).toBeGreaterThan(0.3);
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
    'evaluates tool centrality with core features',
    async () => {
      const toolSeeds = ['hammer', 'screwdriver', 'wrench', 'pliers'];

      const config = {
        context: 'Hand tools for mechanical work and construction',
        coreFeatures: ['handheld', 'mechanical advantage', 'durable materials'],
      };

      const drillResult = await centralTendency('drill', toolSeeds, config);
      const computerResult = await centralTendency('computer', toolSeeds, config);

      expect(drillResult.score).toBeGreaterThan(computerResult.score);
      expect(drillResult.score).toBeGreaterThanOrEqual(0.6); // Drill should be high (allow boundary)
      expect(computerResult.score).toBeLessThan(0.5); // Computer should be low
    },
    longTestTimeout
  );

  it(
    'generates seeds with different diversity levels',
    async () => {
      // High diversity seeds
      const highDiversitySeeds = await generateSeeds('animal', {
        context: 'Diverse animal kingdom representation across phyla',
        count: 6,
        diversityLevel: 'high',
      });

      expect(Array.isArray(highDiversitySeeds)).toBe(true);
      expect(highDiversitySeeds.length).toBeGreaterThan(0);
      expect(highDiversitySeeds.length).toBeLessThanOrEqual(6);

      // Focused seeds
      const focusedSeeds = await generateSeeds('bird', {
        context: 'Common backyard birds',
        count: 5,
        diversityLevel: 'focused',
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
      };

      const results = await bulkCentralTendency(testAnimals, mammalSeeds, config);

      expect(results).toHaveLength(testAnimals.length);

      // Check that most results are valid
      const validResults = results.filter((r) => r !== undefined);
      expect(validResults.length).toBeGreaterThan(testAnimals.length * 0.6);

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

  it(
    'demonstrates graded typicality in sports',
    async () => {
      const sportsSeeds = ['basketball', 'football', 'tennis', 'swimming'];

      const config = {
        context: 'Competitive physical activities with rules and scoring',
        coreFeatures: ['rules', 'competition', 'physical skill', 'scoring'],
      };

      const soccerResult = await centralTendency('soccer', sportsSeeds, config);
      const chessResult = await centralTendency('chess', sportsSeeds, config);
      const videoGamesResult = await centralTendency('video games', sportsSeeds, config);

      // Expect graded typicality: soccer should be more central than chess for physical sports
      expect(soccerResult.score).toBeGreaterThan(chessResult.score);
      // All results should be valid scores
      expect(chessResult.score).toBeGreaterThanOrEqual(0);
      expect(videoGamesResult.score).toBeGreaterThanOrEqual(0);
    },
    longTestTimeout
  );

  it(
    'demonstrates context steering effects',
    async () => {
      const musicSeeds = ['piano', 'guitar', 'violin', 'drums'];
      const testItem = 'harmonica';

      // Traditional/classical music context
      const classicalConfig = {
        context: 'Classical and orchestral instruments for formal concerts',
        coreFeatures: ['acoustic', 'complex technique', 'wide range'],
      };

      // Folk/portable music context
      const folkConfig = {
        context: 'Portable folk and street instruments',
        coreFeatures: ['portable', 'easy to learn', 'expressive'],
      };

      const classicalResult = await centralTendency(testItem, musicSeeds, classicalConfig);
      const folkResult = await centralTendency(testItem, musicSeeds, folkConfig);

      // Harmonica should score higher in folk context
      expect(folkResult.score).toBeGreaterThan(classicalResult.score);
    },
    longTestTimeout
  );
});
