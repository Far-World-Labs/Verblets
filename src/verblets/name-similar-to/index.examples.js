import { describe } from 'vitest';
import nameSimilarTo from './index.js';

import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('nameSimilarTo examples');

describe('nameSimilarTo examples', () => {
  it('suggests a matching name', async () => {
    const result = await nameSimilarTo('record of coffee tasting notes', [
      'BeanDiary',
      'RoastLog',
      'BrewIndex',
    ]);
    expect(typeof result).toBe('string');
    await aiExpect(result).toSatisfy(
      'one of BeanDiary, RoastLog, or BrewIndex — whichever best matches a record of coffee tasting notes'
    );
  });
});
