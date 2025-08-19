import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import listExpand from './index.js';
import vitestAiExpect from '../../chains/expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../../chains/test-analysis/test-wrappers.js';
import { getConfig } from '../../chains/test-analysis/config.js';

//
// Setup AI test wrappers
//
const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'list-expand examples' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'list-expand examples' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'list-expand examples' } })
  : vitestAiExpect;

//
// Test suite
//

describe('list-expand examples', () => {
  it(
    'expands a short list of fruits',
    async () => {
      const result = await listExpand(['apple', 'banana'], 5);
      expect(result.length).toBeGreaterThanOrEqual(5);
    },
    longTestTimeout
  );
});
