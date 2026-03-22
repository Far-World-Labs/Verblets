import { describe } from 'vitest';
import entities, { entitySpec, applyEntities } from './index.js';
import { mapInstructions } from './index.js';
import map from '../map/index.js';
import { techCompanyArticle } from './sample-text.js';
import { longTestTimeout, isMediumBudget } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Entities chain');

const chunks = techCompanyArticle.split('\n\n').filter((chunk) => chunk.trim().length > 0);

describe('entities examples', () => {
  it(
    'extracts entities from text',
    async () => {
      const text = chunks[1];
      const extractor = entities('Extract companies and people');
      const result = await extractor(text);

      expect(result).toHaveProperty('entities');
      expect(Array.isArray(result.entities)).toBe(true);
      expect(result.entities.length).toBeGreaterThan(0);

      await aiExpect(result.entities).toSatisfy(
        'Contains named entities (companies or people) extracted from a tech article'
      );
    },
    longTestTimeout
  );

  it(
    'generates and applies entity specification',
    async () => {
      const spec = await entitySpec('Extract companies, people, and locations');

      expect(typeof spec).toBe('string');
      expect(spec.length).toBeGreaterThan(0);

      const result = await applyEntities(chunks[0], spec);

      expect(result).toHaveProperty('entities');
      expect(Array.isArray(result.entities)).toBe(true);
    },
    longTestTimeout
  );
});

describe.skipIf(!isMediumBudget)('[medium] entities chain operations', () => {
  it(
    'maps entities across chunks',
    async () => {
      const instructions = await mapInstructions('Extract companies and people');
      const results = await map(chunks.slice(0, 3), instructions);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(3);
      expect(results[0]).toBeTruthy();
    },
    longTestTimeout
  );
});
