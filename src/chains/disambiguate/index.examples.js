import { describe, expect, it } from 'vitest';
import disambiguate from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('Disambiguate chain', () => {
  it(
    'contextual meaning: bank',
    async () => {
      const result = await disambiguate({
        term: 'bank',
        context: 'She waited in line at the bank to deposit her paycheck.',
      });
      expect(typeof result.meaning).toBe('string');
      expect(result.meaning.length).toBeGreaterThan(0);
    },
    longTestTimeout
  );
});
