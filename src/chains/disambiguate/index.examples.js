import { describe } from 'vitest';
import disambiguate from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Disambiguate chain');

describe('Disambiguate chain', () => {
  it(
    'contextual meaning: bank',
    async () => {
      const result = await disambiguate(
        'bank',
        'She waited in line at the bank to deposit her paycheck.'
      );
      expect(typeof result.meaning).toBe('string');
      expect(result.meaning.length).toBeGreaterThan(0);
      await aiExpect(result.meaning).toSatisfy(
        'describes a financial institution, not a river bank or other meaning'
      );
    },
    longTestTimeout
  );
});
