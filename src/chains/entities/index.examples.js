import { describe } from 'vitest';
import extractEntities, { entitySpec, entityInstructions } from './index.js';
import map from '../map/index.js';
import filter from '../filter/index.js';
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
      const result = await extractEntities(text, 'Extract companies and people');

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
    'extracts entities with pre-generated spec via extractEntities',
    async () => {
      const spec = await entitySpec('Extract companies, people, and locations');

      expect(typeof spec).toBe('string');
      expect(spec.length).toBeGreaterThan(0);

      const result = await extractEntities(chunks[0], { text: 'Extract entities', spec });

      expect(result).toHaveProperty('entities');
      expect(Array.isArray(result.entities)).toBe(true);
    },
    longTestTimeout
  );
});

describe.skipIf(!isMediumBudget)('[medium] entities with collection chains', () => {
  it(
    'entityInstructions bundle works with map chain',
    async () => {
      const spec = await entitySpec('Extract companies and people');
      const instructions = entityInstructions({ spec });
      const results = await map(chunks.slice(0, 3), instructions);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(3);
      expect(results[0]).toBeTruthy();
    },
    longTestTimeout
  );

  it('entityInstructions bundle works with filter chain', async () => {
    const spec = await entitySpec('Extract companies');
    const instructions = entityInstructions({
      spec,
      text: 'Keep chunks mentioning Apple or Microsoft',
    });

    const filtered = await filter(chunks.slice(0, 10), instructions);

    expect(Array.isArray(filtered)).toBe(true);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(10);
  }, 25000);
});
