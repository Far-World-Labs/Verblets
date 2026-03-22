import { describe } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import filterAmbiguous from './index.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Filter ambiguous chain');

describe('filterAmbiguous examples', () => {
  it(
    'highlights unclear language',
    async () => {
      const text = `I saw her duck\nThe magician made a little girl disappear\nHe fed her dog food`;
      const result = await filterAmbiguous(text, { topN: 2 });
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(2); // topN: 2
      result.forEach((r) => {
        expect(r).toHaveProperty('term');
        expect(r).toHaveProperty('sentence');
        expect(typeof r.score).toBe('number');
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
      });

      await aiExpect(result).toSatisfy(
        'Each item identifies a word or phrase that could be interpreted multiple ways, with a sentence and ambiguity score',
        { mode: 'warn' }
      );
    },
    longTestTimeout
  );
});
