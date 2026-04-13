import { describe } from 'vitest';
import intersections from './index.js';
import { longTestTimeout, isHighBudget } from '../../constants/common.js'; // full: 20-40 LLM calls
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Intersections chain');

describe.skipIf(!isHighBudget)('[high] intersections chain examples', () => {
  it(
    'analyzes technology categories comprehensively',
    async () => {
      const result = await intersections(['software', 'hardware', 'networking']);

      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
      expect(Object.keys(result).length).toBeGreaterThan(0);

      for (const [comboKey, intersection] of Object.entries(result)) {
        expect(comboKey).toMatch(/^.+ \+ .+$/);
        expect(Array.isArray(intersection.combination)).toBe(true);
        expect(Array.isArray(intersection.elements)).toBe(true);
        expect(typeof intersection.description).toBe('string');
        expect(intersection.combination.length).toBeGreaterThanOrEqual(2);
        expect(intersection.description.length).toBeGreaterThan(10);
        expect(intersection.elements.length).toBeGreaterThan(0);
      }

      await aiExpect(result).toSatisfy(
        'Should contain meaningful intersections between technology categories with relevant examples'
      );
    },
    longTestTimeout
  );

  it(
    'follows custom instructions',
    async () => {
      const result = await intersections(
        ['engineering', 'design'],
        'List concrete project ideas that combine these fields. Avoid abstract themes.',
        { batchSize: 2 }
      );

      expect(typeof result).toBe('object');
      expect(Object.keys(result).length).toBeGreaterThan(0);

      const firstIntersection = Object.values(result)[0];
      expect(Array.isArray(firstIntersection.combination)).toBe(true);
      expect(firstIntersection.combination).toContain('engineering');
      expect(firstIntersection.combination).toContain('design');

      await aiExpect(firstIntersection).toSatisfy(
        'Should list specific project ideas combining engineering and design, avoiding abstract themes'
      );
    },
    longTestTimeout
  );
});

describe('intersections edge cases', () => {
  it(
    'returns empty for single category or empty input',
    async () => {
      const singleResult = await intersections(['photography']);
      expect(Object.keys(singleResult).length).toBe(0);

      const emptyResult = await intersections([]);
      expect(Object.keys(emptyResult).length).toBe(0);
    },
    longTestTimeout
  );
});
