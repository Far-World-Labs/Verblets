import group from './index.js';
import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import vitestAiExpect from '../expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Group chain' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Group chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Group chain' } })
  : vitestAiExpect;

describe('group examples', () => {
  it(
    'groups a long list',
    async () => {
      const items = ['dog', 'fish', 'cat', 'whale', 'bird', 'shark', 'horse', 'dolphin'];
      const result = await group(items, 'Is each creature terrestrial or aquatic?', {
        chunkSize: 4,
      });
      expect(typeof result).toBe('object');
      expect(Object.keys(result).length).toBeGreaterThan(0);
    },
    longTestTimeout
  );
});
