import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import themes from './index.js';
import vitestAiExpect from '../expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Themes chain' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Themes chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Themes chain' } })
  : vitestAiExpect;

describe('themes chain', () => {
  it(
    'extracts key themes',
    async () => {
      const text = `Coffee shops are opening all over town. People love the
new flavors but complain about long lines. Local farmers provide beans while
young entrepreneurs drive innovation.`;
      const result = await themes(text, { topN: 2 });
      expect(Array.isArray(result)).toBe(true);
    },
    longTestTimeout
  );
});
