import { describe } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import score, { scoreInstructions, scoreSpec } from './index.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Score chain');

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
      await aiExpect(scores).toSatisfy(
        'numeric humor scores where each value is a reasonable rating'
      );
    },
    longTestTimeout
  );

  it(
    'reuses a pre-generated spec via instruction bundle',
    async () => {
      const spec = await scoreSpec('Rate overall capability');

      const products = [
        'Premium laptop with 32GB RAM',
        'Basic notebook with 4GB RAM',
        'Gaming PC with 64GB RAM',
      ];

      const scores = await score(products, scoreInstructions({ spec }));

      expect(scores).toHaveLength(products.length);
      scores.forEach((s) => expect(typeof s).toBe('number'));
      await aiExpect({ products, scores }).toSatisfy(
        'numeric capability scores where higher-spec products tend to score higher'
      );
    },
    longTestTimeout
  );
});
