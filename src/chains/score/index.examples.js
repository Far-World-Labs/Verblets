import { describe, it, expect } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import score from './index.js';

describe('score examples', () => {
  it(
    'ranks jokes by humor',
    async () => {
      const jokes = [
        'Why did the chicken cross the road? To get to the other side!',
        "Parallel lines have so much in common. It's a shame they'll never meet.",
        "I told my computer I needed a break, and it said 'I'll go to sleep.'",
      ];

      const { scores } = await score(jokes, 'How funny is this joke?');

      expect(scores).toHaveLength(jokes.length);
      scores.forEach((s) => expect(typeof s).toBe('number'));
    },
    longTestTimeout
  );
});
