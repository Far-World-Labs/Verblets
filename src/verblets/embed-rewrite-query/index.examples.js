import { describe } from 'vitest';

import embedRewriteQuery from './index.js';
import { longTestTimeout } from '../../constants/common.js';

import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('embed-rewrite-query');

describe('embed-rewrite-query', () => {
  it(
    'rewrites an ambiguous query into a clearer version',
    async () => {
      const result = await embedRewriteQuery('plants food', {
      });

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toBe('plants food');

      await aiExpect({
        original: 'plants food',
        rewritten: result,
      }).toSatisfy(
        'The rewritten query is a clearer, more specific version of the vague original "plants food". It should expand the meaning (e.g. photosynthesis, plant nutrition) rather than just rephrasing.'
      );
    },
    longTestTimeout
  );

  it(
    'expands abbreviations and jargon',
    async () => {
      const result = await embedRewriteQuery('JS async perf tips', {
      });

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan('JS async perf tips'.length);

      await aiExpect({
        original: 'JS async perf tips',
        rewritten: result,
      }).toSatisfy(
        'The rewritten query expands abbreviations like "JS" to "JavaScript" and "perf" to "performance", producing a clearer search query.'
      );
    },
    longTestTimeout
  );
});
