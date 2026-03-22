import { describe } from 'vitest';

import embedStepBack from './index.js';
import { longTestTimeout } from '../../constants/common.js';

import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect, makeLogger } = getTestHelpers('embed-step-back');

describe('embed-step-back', () => {
  it(
    'generates broader questions from a specific query',
    async () => {
      const result = await embedStepBack('why do lithium batteries swell', {
        logger: makeLogger('generates broader questions from a specific query'),
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
      result.forEach((question) => {
        expect(typeof question).toBe('string');
        expect(question.length).toBeGreaterThan(0);
      });

      await aiExpect({
        specific: 'why do lithium batteries swell',
        broader: result,
      }).toSatisfy(
        'The broader questions step back from the specific query about lithium battery swelling to more fundamental concepts (e.g. battery chemistry, gas generation in electrochemical cells, degradation mechanisms). They should be genuinely more general, not just rephrases of the original.'
      );
    },
    longTestTimeout
  );

  it(
    'steps back from a narrow technical question',
    async () => {
      const result = await embedStepBack(
        'why does my Python script raise a RecursionError on deep JSON parsing',
        {
          logger: makeLogger('steps back from a narrow technical question'),
        }
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);

      await aiExpect({
        specific: 'why does my Python script raise a RecursionError on deep JSON parsing',
        broader: result,
      }).toSatisfy(
        'The broader questions address foundational concepts like recursion limits, call stack depth, or recursive vs iterative parsing — not just the specific Python error.'
      );
    },
    longTestTimeout
  );
});
