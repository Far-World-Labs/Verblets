import { describe, it, expect } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import score, { reduceInstructions } from './index.js';
import reduce from '../reduce/index.js';

describe('score examples', () => {
  it(
    'ranks jokes by humor',
    async () => {
      const jokes = [
        'Why did the chicken cross the road? To get to the other side!',
        "Parallel lines have so much in common. It's a shame they'll never meet.",
        "I told my computer I needed a break, and it said 'I'll go to sleep.'",
      ];

      const scores = await score(jokes, 'How funny is this joke?');

      expect(scores).toHaveLength(jokes.length);
      scores.forEach((s) => expect(typeof s).toBe('number'));
    },
    longTestTimeout
  );

  it(
    'uses score-based reduction',
    async () => {
      const products = [
        'Premium laptop with 32GB RAM',
        'Basic notebook with 4GB RAM',
        'Gaming PC with 64GB RAM',
      ];

      const bestValue = await reduce(
        products,
        await reduceInstructions({
          scoring: 'value for money considering specs',
          processing: 'find the item with the highest score',
        })
      );

      expect(bestValue).toBeDefined();
      expect(typeof bestValue).toBe('string');
    },
    longTestTimeout
  );
});
