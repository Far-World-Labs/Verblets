import { describe } from 'vitest';
import sentiment from './index.js';

import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

//
// Setup AI test wrappers
//
const { it, expect, aiExpect } = getTestHelpers('sentiment');

//
// Test suite
//

const examples = [
  { text: 'I love sunny days!', want: 'positive' },
  { text: 'This is the worst movie ever.', want: 'negative' },
];

describe('sentiment', () => {
  examples.forEach(({ text, want }) => {
    it(text, async () => {
      expect(await sentiment(text)).toBe(want);
    });
  });
});
