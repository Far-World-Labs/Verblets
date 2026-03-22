import { describe } from 'vitest';
import entities, { createEntityExtractor, entitySpec, applyEntities } from './index.js';
import {
  mapInstructions,
  reduceInstructions,
  filterInstructions,
  groupInstructions,
  findInstructions,
} from './index.js';
import map from '../map/index.js';
import reduce from '../reduce/index.js';
import filter from '../filter/index.js';
import group from '../group/index.js';
import find from '../find/index.js';
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

// Each instruction generator (mapInstructions, reduceInstructions, etc.) produces
// entity-aware prompts — these test that the DSL flows correctly through each chain.
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

  it('reduces entities to consolidated list', async () => {
    const instructions = await reduceInstructions({
      entities: 'Extract all companies',
      processing: 'Merge duplicates into single list',
    });

    const consolidated = await reduce(chunks.slice(0, 5), instructions, []);

    expect(consolidated).toBeTruthy();
  }, 25000);

  it('filters chunks containing specific entities', async () => {
    const instructions = await filterInstructions({
      entities: 'Extract companies',
      processing: 'Keep chunks mentioning Apple or Microsoft',
    });

    const filtered = await filter(chunks.slice(0, 10), instructions);

    expect(Array.isArray(filtered)).toBe(true);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(10);
  }, 25000);

  it(
    'finds chunk with most entities',
    async () => {
      const instructions = await findInstructions({
        entities: 'Extract all named entities',
        processing: 'Select chunk with highest entity density',
      });

      const found = await find(chunks.slice(0, 5), instructions);

      expect(typeof found).toBe('string');
      expect(found.length).toBeGreaterThan(0);
    },
    longTestTimeout
  );

  it('groups chunks by entity types', async () => {
    const instructions = await groupInstructions({
      entities: 'Extract companies and financial figures',
      processing: 'Group by whether chunk contains acquisitions vs partnerships',
    });

    const grouped = await group(chunks.slice(0, 8), instructions);

    expect(typeof grouped).toBe('object');
    expect(Object.keys(grouped).length).toBeGreaterThan(0);
  }, 25000);

  it(
    'creates reusable extractor with spec',
    async () => {
      const spec = await entitySpec('Extract tech companies and their CEOs');
      const extractor = createEntityExtractor(spec);

      const result1 = await extractor(chunks[0]);
      const result2 = await extractor(chunks[1]);

      expect(result1).toBeTruthy();
      expect(result2).toBeTruthy();
      expect(extractor.specification).toBe(spec);
    },
    longTestTimeout
  );
});
