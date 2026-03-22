import { describe } from 'vitest';
import commonalities from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('commonalities');

describe('commonalities verblet', () => {
  it(
    'finds shared traits between technology devices',
    async () => {
      const result = await commonalities(['smartphone', 'tablet', 'laptop']);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      await aiExpect(result).toSatisfy(
        'Meaningful commonalities between electronic devices — portability, computing capability, or digital interface'
      );
    },
    longTestTimeout
  );

  it(
    'returns empty array for single item or empty input',
    async () => {
      const singleResult = await commonalities(['single-item']);
      expect(singleResult).toEqual([]);

      const emptyResult = await commonalities([]);
      expect(emptyResult).toEqual([]);
    },
    longTestTimeout
  );
});
