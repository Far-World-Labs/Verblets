import { describe, expect as vitestExpect, it as vitestIt, beforeAll, afterAll } from 'vitest';
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
import vitestAiExpect from '../expect/index.js';
import { logSuiteStart, logSuiteEnd } from '../test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Entities chain' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Entities chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Entities chain' } })
  : vitestAiExpect;
const suiteLogStart = config?.aiMode ? logSuiteStart : () => {};
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

beforeAll(async () => {
  await suiteLogStart('Entities chain', extractFileContext(2));
});

afterAll(async () => {
  await suiteLogEnd('Entities chain', extractFileContext(2));
});

// Split the article into chunks
const chunks = techCompanyArticle.split('\n\n').filter((chunk) => chunk.trim().length > 0);

describe('entities examples', () => {
  it('should extract entities from text', async () => {
    const text = chunks[0];
    const extractor = entities('Extract companies and people');
    const result = await extractor(text);

    expect(result).toHaveProperty('entities');
    expect(Array.isArray(result.entities)).toBe(true);
    expect(result.entities.length).toBeGreaterThan(0);
  }, 15000);

  it('should map entities across chunks', async () => {
    const instructions = await mapInstructions('Extract companies and people');
    const results = await map(chunks.slice(0, 3), instructions);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(3);
    // Map returns the transformed items directly, which should be entity objects/arrays
    expect(results[0]).toBeTruthy();
  }, 20000);

  it('should reduce entities to consolidated list', async () => {
    const instructions = await reduceInstructions({
      entities: 'Extract all companies',
      processing: 'Merge duplicates into single list',
    });

    const consolidated = await reduce(chunks.slice(0, 5), instructions, []);

    // Reduce should return an array of entities
    expect(consolidated).toBeTruthy();
  }, 25000);

  it('should filter chunks containing specific entities', async () => {
    const instructions = await filterInstructions({
      entities: 'Extract companies',
      processing: 'Keep chunks mentioning Apple or Microsoft',
    });

    const filtered = await filter(chunks.slice(0, 10), instructions);

    expect(Array.isArray(filtered)).toBe(true);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(10);
  }, 25000);

  it('should find chunk with most entities', async () => {
    const instructions = await findInstructions({
      entities: 'Extract all named entities',
      processing: 'Select chunk with highest entity density',
    });

    const found = await find(chunks.slice(0, 5), instructions);

    expect(typeof found).toBe('string');
    expect(found.length).toBeGreaterThan(0);
  }, 20000);

  it('should group chunks by entity types', async () => {
    const instructions = await groupInstructions({
      entities: 'Extract companies and financial figures',
      processing: 'Group by whether chunk contains acquisitions vs partnerships',
    });

    const grouped = await group(chunks.slice(0, 8), instructions);

    expect(typeof grouped).toBe('object');
    expect(Object.keys(grouped).length).toBeGreaterThan(0);
  }, 25000);
});

describe('createEntityExtractor examples', () => {
  it('should create reusable extractor', async () => {
    const spec = await entitySpec('Extract tech companies and their CEOs');
    const extractor = createEntityExtractor(spec);

    const result1 = await extractor(chunks[0]);
    const result2 = await extractor(chunks[1]);

    expect(result1).toBeTruthy();
    expect(result2).toBeTruthy();
    expect(extractor.specification).toBe(spec);
  }, 20000);
});

describe('entitySpec and applyEntities examples', () => {
  it('should generate and apply entity specification', async () => {
    const spec = await entitySpec('Extract companies, people, and locations');

    expect(typeof spec).toBe('string');
    expect(spec.length).toBeGreaterThan(0);

    const result = await applyEntities(chunks[0], spec);

    expect(result).toHaveProperty('entities');
    expect(Array.isArray(result.entities)).toBe(true);
  }, 15000);
});
