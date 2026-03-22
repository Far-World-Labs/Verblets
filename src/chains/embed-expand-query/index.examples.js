import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';

import embedExpandQuery from './index.js';
import embedNormalizeText from '../../lib/embed-normalize-text/index.js';
import embedNeighborChunks from '../../lib/embed-neighbor-chunks/index.js';
import { longTestTimeout } from '../../constants/common.js';
import vitestAiExpect from '../expect/index.js';

import {
  makeWrappedIt,
  makeWrappedExpect,
  makeWrappedAiExpect,
} from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const suite = 'embed-expand-query';

const it = makeWrappedIt(vitestIt, suite, config);
const expect = makeWrappedExpect(vitestExpect, suite, config);
const aiExpect = makeWrappedAiExpect(vitestAiExpect, suite, config);

const makeTestLogger = (testName) => {
  return config?.aiMode && globalThis.logger
    ? globalThis.logger.child({ suite, testName })
    : undefined;
};

describe('embed-expand-query', () => {
  it(
    'expands a query using all strategies',
    async () => {
      const result = await embedExpandQuery('why do lithium batteries swell after a year of use', {
        logger: makeTestLogger('expands a query using all strategies'),
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toBe('why do lithium batteries swell after a year of use');
      expect(result.length).toBeGreaterThanOrEqual(5);

      const unique = new Set(result);
      expect(unique.size).toBe(result.length);

      await aiExpect({
        original: 'why do lithium batteries swell after a year of use',
        expanded: result.slice(1),
      }).toSatisfy(
        'The expanded queries cover diverse angles: rewrites for clarity, multi-query variants with different terminology, step-back questions about broader battery chemistry concepts, and atomic sub-questions targeting specific facts. They should not all be near-identical rephrases.'
      );
    },
    longTestTimeout
  );

  it(
    'works with a subset of strategies',
    async () => {
      const result = await embedExpandQuery('machine learning overfitting', {
        strategies: ['rewrite', 'subquestions'],
        logger: makeTestLogger('works with a subset of strategies'),
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toBe('machine learning overfitting');
      expect(result.length).toBeGreaterThanOrEqual(3);
    },
    longTestTimeout
  );

  it(
    'composes with embedNormalizeText and embedNeighborChunks for a full RAG pipeline',
    async () => {
      const rawDoc =
        'Lithium-ion batteries   use  liquid\r\nelectrolytes.\r\n\r\nGas buildup causes swelling [1].\r\nDegradation accelerates above 40°C [2].';

      const cleanDoc = embedNormalizeText(rawDoc, {
        stripPatterns: [/\[\d+\]/g],
      });

      expect(cleanDoc).not.toContain('\r');
      expect(cleanDoc).not.toContain('[1]');

      const allChunks = cleanDoc.split('\n\n').map((text, i, arr) => {
        const start = arr.slice(0, i).reduce((s, t) => s + t.length + 2, 0);
        return { text, start, end: start + text.length };
      });

      const hits = [{ start: allChunks[1].start, score: 0.95 }];
      const passages = embedNeighborChunks(hits, allChunks, { windowSize: 1 });

      expect(passages).toHaveLength(1);
      expect(passages[0].text).toContain('electrolytes');
      expect(passages[0].text).toContain('swelling');

      const queries = await embedExpandQuery('why do lithium batteries swell', {
        strategies: ['rewrite', 'multi'],
        logger: makeTestLogger(
          'composes with embedNormalizeText and embedNeighborChunks for a full RAG pipeline'
        ),
      });

      expect(queries[0]).toBe('why do lithium batteries swell');
      expect(queries.length).toBeGreaterThanOrEqual(3);
    },
    longTestTimeout
  );
});
