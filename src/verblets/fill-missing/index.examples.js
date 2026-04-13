import { describe } from 'vitest';
import fillMissing from './index.js';

import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('fillMissing example');

describe('fillMissing example', () => {
  it('fills missing values with plausible candidates', async () => {
    const { template, variables } = await fillMissing('The ??? went to the ???.', {
      creativity: 'high',
    });

    expect(typeof template).toBe('string');
    expect(template.length).toBeGreaterThan(0);
    expect(typeof variables).toBe('object');

    const entries = Object.values(variables);
    expect(entries.length).toBeGreaterThanOrEqual(1);
    entries.forEach((v) => {
      expect(v).toHaveProperty('candidate');
      expect(v).toHaveProperty('confidence');
      expect(typeof v.confidence).toBe('number');
    });

    const allCandidates = entries.map((v) => v.candidate);
    await aiExpect(allCandidates).toSatisfy(
      'plausible words or phrases (not "[UNKNOWN]") that could fill blanks in "The ___ went to the ___"'
    );
  });
});
