import { describe } from 'vitest';
import relationItem, { relationSpec, relationInstructions } from './index.js';
import map from '../map/index.js';
import filter from '../filter/index.js';
import { techCompanyArticle, historicalNarrative } from '../entities/sample-text.js';
import {
  longTestTimeout,
  extendedTestTimeout,
  isMediumBudget,
  isHighBudget,
} from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Relations examples');

const techChunks = techCompanyArticle.split('\n\n').filter((chunk) => chunk.trim().length > 0);
const historyChunks = historicalNarrative.split('\n\n').filter((chunk) => chunk.trim().length > 0);

describe.skipIf(!isHighBudget)('[high] relations examples', () => {
  it(
    'extracts business relations from text',
    async () => {
      const text = techChunks[1];
      const result = await relationItem(text, 'Extract business relationships and partnerships');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const partnershipRelation = result.find(
        (r) =>
          r.predicate.toLowerCase().includes('partner') ||
          r.predicate.toLowerCase().includes('collaborat')
      );
      expect(partnershipRelation).toBeTruthy();
    },
    longTestTimeout
  );

  it(
    'extracts relations with primitive values (numbers, dates)',
    async () => {
      const text = `Apple reported revenue of $394.3 billion in fiscal year 2022.
    The company was founded on April 1, 1976.
    Apple has 164,000 employees worldwide.`;

      const result = await relationItem(text, {
        relations: 'Extract company metrics and dates as precise values',
        predicates: ['revenue', 'founded on', 'employee count'],
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const revenueRelation = result.find((r) => r.predicate.includes('revenue'));
      if (revenueRelation) {
        expect(typeof revenueRelation.object).toBe('number');
        expect(revenueRelation.object).toBeGreaterThan(300);
      }
    },
    longTestTimeout
  );

  it(
    'relationInstructions bundle works with map chain',
    async () => {
      const spec = await relationSpec({
        relations: 'Extract all business relationships',
        predicates: ['acquired', 'partnered with', 'competes with', 'invested in'],
      });

      const instructions = relationInstructions({
        spec,
        text: 'Focus on merger and acquisition activities',
      });

      const results = await map(techChunks.slice(3, 6), instructions);

      expect(Array.isArray(results)).toBe(true);
    },
    extendedTestTimeout
  );

  it(
    'relationInstructions bundle works with filter chain',
    async () => {
      const spec = await relationSpec({
        relations: 'Extract acquisition and investment relationships',
        predicates: ['acquired', 'purchased', 'bought'],
      });

      const instructions = relationInstructions({
        spec,
        text: 'Keep only chunks mentioning acquisitions over $1 billion',
      });

      const filtered = await filter(techChunks.slice(0, 10), instructions);

      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.length).toBeLessThan(10);
    },
    longTestTimeout
  );
});

describe.skipIf(!isMediumBudget)('[medium] relationItem with instruction bundle', () => {
  it(
    'extracts relations with pre-generated spec',
    async () => {
      const spec = await relationSpec({
        relations: 'Extract ruler succession and territorial control',
        predicates: ['succeeded', 'ruled', 'conquered', 'founded'],
      });

      expect(typeof spec).toBe('string');
      expect(spec.length).toBeGreaterThan(0);

      const result = await relationItem(historyChunks[7], { text: 'Extract relations', spec });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      await aiExpect(result).toSatisfy(
        'Historical relations about rulers, succession, or territorial control'
      );
    },
    longTestTimeout
  );
});
