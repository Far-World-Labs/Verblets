import { describe } from 'vitest';
import sentiment from './index.js';

import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('sentiment');

const examples = [
  { text: 'I love sunny days!', want: 'positive' },
  { text: 'This is the worst movie ever.', want: 'negative' },
];

describe('sentiment', () => {
  examples.forEach(({ text, want }) => {
    it(text, async () => {
      const result = await sentiment(text);
      expect(result).toBe(want);
      await aiExpect(result).toSatisfy(`the correct sentiment (${want}) for: "${text}"`);
    });
  });
});
