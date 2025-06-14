import { describe, it, expect } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import filterAmbiguous from './index.js';

describe('filterAmbiguous examples', () => {
  it(
    'highlights unclear language',
    async () => {
      const text = `I saw her duck\nThe magician made a little girl disappear\nHe fed her dog food`;
      const result = await filterAmbiguous(text, { topN: 2 });
      expect(result.length).toBeGreaterThan(0);
      result.forEach((r) => {
        expect(r).toHaveProperty('term');
        expect(r).toHaveProperty('sentence');
        expect(typeof r.score).toBe('number');
      });
    },
    longTestTimeout
  );
});
