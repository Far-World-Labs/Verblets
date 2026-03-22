import { describe } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import centralTendency from './index.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect, makeLogger } = getTestHelpers('Central-tendency chain');

describe('Bulk Central Tendency Chain', () => {
  it(
    'processes multiple fruit items with consistent results',
    async () => {
      const items = ['apple', 'orange', 'durian', 'jackfruit', 'banana'];
      const seedItems = ['apple', 'orange', 'banana', 'grape', 'strawberry'];

      const logger = makeLogger('processes multiple fruit items');
      const results = await centralTendency(items, seedItems, {
        context: 'Common fruits found in grocery stores',
        logger,
      });

      expect(results).toHaveLength(5);
      expect(results.every((r) => r && typeof r.score === 'number')).toBe(true);
      expect(results.every((r) => r && r.score >= 0 && r.score <= 1)).toBe(true);
      expect(results.every((r) => r && typeof r.reason === 'string')).toBe(true);
      expect(results.every((r) => r && typeof r.confidence === 'number')).toBe(true);

      // Use expect-chain for loose verification
      await aiExpect(results).toSatisfy(
        'Do these centrality scores make sense? Common fruits like apple, orange, banana should have higher scores than exotic fruits like durian and jackfruit.'
      );
    },
    longTestTimeout
  );

  it(
    'handles tool centrality with core features',
    async () => {
      const items = ['hammer', 'screwdriver', 'wrench', 'pliers', 'chainsaw'];
      const seedItems = ['hammer', 'screwdriver', 'wrench', 'saw', 'drill'];

      const results = await centralTendency(items, seedItems, {
        context: 'Hand tools for construction and repair',
        coreFeatures: ['handheld', 'mechanical', 'durable'],
      });

      expect(results).toHaveLength(5);
      expect(results.every((r) => r && typeof r.score === 'number')).toBe(true);
      expect(results.every((r) => r && r.score >= 0 && r.score <= 1)).toBe(true);

      // Use expect-chain for loose verification
      await aiExpect(results).toSatisfy(
        'Do these tool centrality scores make sense? Basic hand tools like hammer, screwdriver, wrench should have high scores, while chainsaw (power tool) should have a lower score.'
      );
    },
    longTestTimeout
  );

  it(
    'demonstrates context effects on centrality',
    async () => {
      const items = ['robin', 'eagle', 'penguin', 'ostrich'];
      const seedItems = ['robin', 'sparrow', 'cardinal', 'blue jay'];

      const logger = makeLogger('demonstrates context effects');
      const results = await centralTendency(items, seedItems, {
        context: 'Small songbirds commonly seen in backyards',
        logger,
      });

      expect(results).toHaveLength(4);
      expect(results.every((r) => r && typeof r.score === 'number')).toBe(true);

      // Use expect-chain for loose verification
      await aiExpect(results).toSatisfy(
        'Given the context of "small songbirds commonly seen in backyards", does robin have the highest centrality score, while penguin and ostrich have much lower scores?'
      );
    },
    longTestTimeout
  );

  it(
    'handles items with varying centrality to the seed group',
    async () => {
      const items = ['cat', 'dog', 'elephant', 'hamster', 'goldfish'];
      const seedItems = ['cat', 'dog', 'rabbit', 'hamster', 'guinea pig'];

      const logger = makeLogger('varying centrality');
      const results = await centralTendency(items, seedItems, {
        context: 'Common household pets',
        logger,
      });

      expect(results).toHaveLength(5);
      expect(results.every((r) => r && typeof r.score === 'number')).toBe(true);
      expect(results.every((r) => r && r.score >= 0 && r.score <= 1)).toBe(true);

      await aiExpect(results).toSatisfy(
        'Are these reasonable centrality scores for household pets, with cat, dog, and hamster having higher scores than elephant?'
      );
    },
    longTestTimeout
  );

  it('handles empty input', async () => {
    const results = await centralTendency([], ['apple', 'orange']);
    expect(results).toEqual([]);
  });

  it('throws error for invalid seed items', async () => {
    await expect(centralTendency(['apple'], [])).rejects.toThrow(
      'seedItems must be a non-empty array'
    );
    await expect(centralTendency(['apple'], null)).rejects.toThrow(
      'seedItems must be a non-empty array'
    );
  });

  it(
    'processes large batches efficiently',
    async () => {
      const items = Array.from({ length: 15 }, (_, i) => `item${i + 1}`);
      const seedItems = ['item1', 'item2', 'item3', 'item4', 'item5'];

      const logger = makeLogger('processes large batches');
      const results = await centralTendency(items, seedItems, {
        batchSize: 3,
        logger,
      });

      expect(results).toHaveLength(15);
      expect(results.every((r) => r && typeof r.score === 'number')).toBe(true);
      expect(results.every((r) => r && r.score >= 0 && r.score <= 1)).toBe(true);
    },
    longTestTimeout
  );
});
