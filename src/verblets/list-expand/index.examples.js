import { describe } from 'vitest';
import listExpand from './index.js';

import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('list-expand examples');

describe('list-expand examples', () => {
  it('expands a short list of fruits', async () => {
    const result = await listExpand(['apple', 'banana'], 5);
    expect(result.length).toBeGreaterThanOrEqual(5);
  });
});
