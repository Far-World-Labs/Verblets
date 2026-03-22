import { describe } from 'vitest';
import relations, { relationSpec, applyRelations } from './index.js';
import { longTestTimeout, isMediumBudget, isHighBudget } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Relations examples');
import { techCompanyArticle, historicalNarrative } from '../entities/sample-text.js';

const techChunks = techCompanyArticle.split('\n\n').filter((chunk) => chunk.trim().length > 0);
const historyChunks = historicalNarrative.split('\n\n').filter((chunk) => chunk.trim().length > 0);

describe.skipIf(!isHighBudget)('[high] relations examples', () => {
  it(
    'extracts business relations from text',
    async () => {
      const text = techChunks[1];
      const extractor = relations('Extract business relationships and partnerships');
      const result = await extractor(text);

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

      const extractor = relations({
        relations: 'Extract company metrics and dates as precise values',
        predicates: ['revenue', 'founded on', 'employee count'],
      });
      const result = await extractor(text);

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
});

describe.skipIf(!isMediumBudget)('[medium] relationSpec and applyRelations', () => {
  it(
    'generates and applies relation specification',
    async () => {
      const spec = await relationSpec({
        relations: 'Extract ruler succession and territorial control',
        predicates: ['succeeded', 'ruled', 'conquered', 'founded'],
      });

      expect(typeof spec).toBe('string');
      expect(spec.length).toBeGreaterThan(0);

      const result = await applyRelations(historyChunks[7], spec);

      expect(result).toBeTruthy();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);

      await aiExpect(result.items).toSatisfy(
        'Historical relations about rulers, succession, or territorial control'
      );
    },
    longTestTimeout
  );
});
