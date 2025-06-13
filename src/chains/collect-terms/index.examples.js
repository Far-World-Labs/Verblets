import { describe, expect, it } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import collectTerms from './index.js';

const sample = `Quantum entanglement and the observer effect are central to modern physics. Understanding Heisenberg's uncertainty principle alongside quantum decoherence helps explain particle behavior at subatomic scales.`;

describe('collectTerms chain', () => {
  it(
    'Example',
    async () => {
      const terms = await collectTerms(sample, { topN: 5 });
      expect(Array.isArray(terms)).toBe(true);
    },
    longTestTimeout
  );
});
