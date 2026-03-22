import { describe } from 'vitest';

import embedMultiQuery from './index.js';
import { longTestTimeout } from '../../constants/common.js';

import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect, makeLogger } = getTestHelpers('embed-multi-query');

describe('embed-multi-query', () => {
  it(
    'generates diverse query variants',
    async () => {
      const result = await embedMultiQuery('how do plants make food', {
        logger: makeLogger('generates diverse query variants'),
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
      result.forEach((variant) => {
        expect(typeof variant).toBe('string');
        expect(variant.length).toBeGreaterThan(0);
      });

      await aiExpect({
        original: 'how do plants make food',
        variants: result,
      }).toSatisfy(
        'The variants are diverse search queries related to the original question about plants making food. They should approach the topic from different angles (e.g. photosynthesis, plant biology, chloroplasts, sunlight conversion) rather than being near-identical rephrases.'
      );
    },
    longTestTimeout
  );

  it(
    'respects the count parameter',
    async () => {
      const result = await embedMultiQuery('machine learning basics', {
        count: 4,
        logger: makeLogger('respects the count parameter'),
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(4);
      result.forEach((variant) => {
        expect(typeof variant).toBe('string');
      });
    },
    longTestTimeout
  );
});
