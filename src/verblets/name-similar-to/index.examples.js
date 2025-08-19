import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import nameSimilarTo from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import vitestAiExpect from '../../chains/expect/index.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../../chains/test-analysis/test-wrappers.js';
import { getConfig } from '../../chains/test-analysis/config.js';

//
// Setup AI test wrappers
//
const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'nameSimilarTo examples' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'nameSimilarTo examples' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'nameSimilarTo examples' } })
  : vitestAiExpect;

//
// Test suite
//

describe('nameSimilarTo examples', () => {
  it(
    'suggests a matching name',
    async () => {
      const result = await nameSimilarTo('record of coffee tasting notes', [
        'BeanDiary',
        'RoastLog',
        'BrewIndex',
      ]);
      expect(typeof result).toBe('string');
    },
    longTestTimeout
  );
});
