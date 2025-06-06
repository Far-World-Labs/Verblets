import { describe, it, expect } from 'vitest';
import sentiment from './index.js';
import { longTestTimeout } from '../../constants/common.js';

const examples = [
  { text: 'I love sunny days!', want: 'positive' },
  { text: 'This is the worst movie ever.', want: 'negative' },
];

describe('sentiment', () => {
  examples.forEach(({ text, want }) => {
    it(
      text,
      async () => {
        expect(await sentiment(text)).toBe(want);
      },
      longTestTimeout
    );
  });
});
