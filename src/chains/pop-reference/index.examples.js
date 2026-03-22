import { describe } from 'vitest';
import popReference from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Pop reference chain');

describe('popReference examples', () => {
  it(
    'finds references for a decision moment',
    async () => {
      const result = await popReference(
        'She finally made a decision after months of doubt',
        'pivotal moment of choosing clarity over comfort'
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('reference');
      expect(result[0]).toHaveProperty('source');
      expect(result[0]).toHaveProperty('score');
      expect(result[0].score).toBeGreaterThanOrEqual(0);
      expect(result[0].score).toBeLessThanOrEqual(1);

      await aiExpect(result).toSatisfy(
        'References relate metaphorically to decision-making or pivotal moments'
      );
    },
    longTestTimeout
  );

  it(
    'filters to specified sources',
    async () => {
      const result = await popReference(
        'The meeting dragged on with everyone avoiding the real issue',
        'workplace dysfunction and avoidance',
        { include: ['The Office', 'Parks and Recreation', 'Silicon Valley'] }
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      const validSources = ['the office', 'parks and recreation', 'silicon valley'];
      result.forEach((ref) => {
        const sourceMatch = validSources.some((s) => ref.source.toLowerCase().includes(s));
        expect(sourceMatch).toBe(true);
      });
    },
    longTestTimeout
  );

  it(
    'supports weighted sources',
    async () => {
      const result = await popReference(
        'They had to choose between safety and adventure',
        'life-changing decision between comfort and growth',
        {
          include: [
            { reference: 'Lord of the Rings', percent: 60 },
            { reference: 'Star Wars', percent: 30 },
            { reference: 'Harry Potter', percent: 10 },
          ],
          referencesPerSource: 1,
        }
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThanOrEqual(1);

      const validSources = ['lord of the rings', 'star wars', 'harry potter'];
      result.forEach((ref) => {
        const sourceMatch = validSources.some((s) => ref.source.toLowerCase().includes(s));
        expect(sourceMatch).toBe(true);
      });
    },
    longTestTimeout
  );
});
