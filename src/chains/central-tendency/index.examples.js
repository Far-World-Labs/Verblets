import { describe } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import centralTendency from './index.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Central-tendency chain');

describe('Bulk Central Tendency Chain', () => {
  it(
    'scores items by centrality to a seed group',
    async () => {
      const items = ['apple', 'orange', 'durian', 'jackfruit', 'banana'];
      const seedItems = ['apple', 'orange', 'banana', 'grape', 'strawberry'];

      const results = await centralTendency(items, seedItems, {
        context: 'Common fruits found in grocery stores',
      });

      expect(results).toHaveLength(5);
      expect(results.every((r) => r && typeof r.score === 'number')).toBe(true);
      expect(results.every((r) => r && r.score >= 0 && r.score <= 1)).toBe(true);
      expect(results.every((r) => r && typeof r.reason === 'string')).toBe(true);

      await aiExpect(results).toSatisfy(
        'Common fruits like apple, orange, banana should have higher centrality scores than exotic fruits like durian and jackfruit'
      );
    },
    longTestTimeout
  );

  it(
    'context shifts centrality scoring',
    async () => {
      const items = ['robin', 'eagle', 'penguin', 'ostrich'];
      const seedItems = ['robin', 'sparrow', 'cardinal', 'blue jay'];

      const results = await centralTendency(items, seedItems, {
        context: 'Small songbirds commonly seen in backyards',
      });

      expect(results).toHaveLength(4);
      expect(results.every((r) => r && typeof r.score === 'number')).toBe(true);

      await aiExpect(results).toSatisfy(
        'Robin should have the highest centrality score; penguin and ostrich should score much lower since they are not small songbirds'
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
});
