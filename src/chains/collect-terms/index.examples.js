import { describe } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import collectTerms from './index.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('CollectTerms chain');

const sample = `Quantum entanglement and the observer effect are central to modern physics. Understanding Heisenberg's uncertainty principle alongside quantum decoherence helps explain particle behavior at subatomic scales.`;

describe('collectTerms chain', () => {
  it(
    'Example',
    async () => {
      const terms = await collectTerms(sample, { topN: 5 });
      expect(Array.isArray(terms)).toBe(true);
      expect(terms.length).toBeGreaterThanOrEqual(2);
      await aiExpect(terms).toSatisfy('an array of physics terms relevant to quantum mechanics');
    },
    longTestTimeout
  );
});
