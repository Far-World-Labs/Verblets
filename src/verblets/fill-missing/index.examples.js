import { describe } from 'vitest';
import fillMissing from './index.js';
import templateReplace from '../../lib/template-replace/index.js';

import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('fillMissing example');

describe('fillMissing example', () => {
  it('fills high-confidence values only', async () => {
    const { template, variables } = await fillMissing('The ??? went to the ???.');
    const confident = Object.fromEntries(
      Object.entries(variables)
        .filter(([, v]) => v.confidence > 0.8)
        .map(([k, v]) => [k, v.candidate])
    );
    templateReplace(template, confident, '<unknown>');
  });
});
