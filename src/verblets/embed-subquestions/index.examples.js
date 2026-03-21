import { describe } from 'vitest';

import embedSubquestions from './index.js';
import { longTestTimeout } from '../../constants/common.js';

import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect, makeLogger } = getTestHelpers('embed-subquestions');

describe('embed-subquestions', () => {
  it(
    'decomposes a multi-faceted question into atomic sub-questions',
    async () => {
      const result = await embedSubquestions(
        'Is Tokyo more affordable than London for the average resident?',
        {
          logger: makeLogger('decomposes a multi-faceted question into atomic sub-questions'),
        }
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
      result.forEach((sub) => {
        expect(typeof sub).toBe('string');
        expect(sub.length).toBeGreaterThan(0);
      });

      await aiExpect({
        original: 'Is Tokyo more affordable than London for the average resident?',
        subQuestions: result,
      }).toSatisfy(
        'The sub-questions are atomic — each targets a single piece of information (e.g. cost of living in Tokyo, cost of living in London, average income in each city). Together they cover what is needed to answer the original comparison question.'
      );
    },
    longTestTimeout
  );

  it(
    'handles a query with multiple independent aspects',
    async () => {
      const result = await embedSubquestions(
        'What are the health benefits and environmental impact of a vegetarian diet compared to a meat-based diet?',
        {
          logger: makeLogger('handles a query with multiple independent aspects'),
        }
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(3);

      await aiExpect({
        original:
          'What are the health benefits and environmental impact of a vegetarian diet compared to a meat-based diet?',
        subQuestions: result,
      }).toSatisfy(
        'The sub-questions separately address health benefits and environmental impact for both diet types, rather than lumping them together.'
      );
    },
    longTestTimeout
  );
});
