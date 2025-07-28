import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import relations, { createRelationExtractor, relationSpec, applyRelations } from './index.js';
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
import { techCompanyArticle, historicalNarrative } from '../entities/sample-text.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const relationResultSchema = JSON.parse(
  readFileSync(join(__dirname, 'relation-result.json'), 'utf8')
);

// Split the articles into chunks
const techChunks = techCompanyArticle.split('\n\n').filter((chunk) => chunk.trim().length > 0);
const historyChunks = historicalNarrative.split('\n\n').filter((chunk) => chunk.trim().length > 0);

describe('relations examples', () => {
  it('should extract relations from tech company text', async () => {
    const text = techChunks[1]; // Chunk about Apple-Microsoft partnership
    const extractor = relations('Extract business relationships and partnerships');
    const result = await extractor(text);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // Should find relations like Apple-partnership-Microsoft
    const partnershipRelation = result.find(
      (r) =>
        r.predicate.toLowerCase().includes('partner') ||
        r.predicate.toLowerCase().includes('collaborat')
    );
    expect(partnershipRelation).toBeTruthy();
  }, 15000);

  it('should extract relations with primitive values', async () => {
    const text = `Apple reported revenue of $394.3 billion in fiscal year 2022. 
    The company was founded on April 1, 1976. 
    Apple has 164,000 employees worldwide.
    The iPhone 15 was released on September 22, 2023.
    Apple's market cap exceeded $3 trillion in 2023.`;

    const extractor = relations({
      relations: 'Extract company metrics and dates as precise values',
      predicates: ['revenue', 'founded on', 'employee count', 'released on', 'market cap'],
    });
    const result = await extractor(text);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // Check for numeric values
    const revenueRelation = result.find((r) => r.predicate.includes('revenue'));
    if (revenueRelation) {
      expect(typeof revenueRelation.object).toBe('number');
      // The value might be in billions (394.3) or full value (394300000000)
      // Accept either format
      expect(revenueRelation.object).toBeGreaterThan(300);
    }

    // Check for date values
    const foundedRelation = result.find((r) => r.predicate.includes('founded'));
    if (foundedRelation) {
      expect(foundedRelation.object instanceof Date).toBe(true);
    }

    // Check for integer values
    const employeeRelation = result.find((r) => r.predicate.includes('employee'));
    if (employeeRelation) {
      expect(typeof employeeRelation.object).toBe('number');
      expect(Number.isInteger(employeeRelation.object)).toBe(true);
    }
  }, 15000);

  it('should extract relations with entity disambiguation', async () => {
    const text = techChunks[2]; // Tim Cook meeting text
    const entities = [
      { name: 'Tim Cook', type: 'person', canonical: 'Tim Cook' },
      { name: 'Satya Nadella', type: 'person', canonical: 'Satya Nadella' },
      { name: 'Apple', type: 'company', canonical: 'Apple Inc.' },
      { name: 'Microsoft', type: 'company', canonical: 'Microsoft Corporation' },
    ];

    const extractor = relations({
      relations: 'Extract meeting and leadership relationships',
      entities,
    });
    const result = await extractor(text);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    // Check that canonical forms are used
    const cookRelation = result.find((r) => r.subject === 'Tim Cook');
    expect(cookRelation).toBeTruthy();
  }, 15000);

  it('should extract historical relations', async () => {
    const text = historyChunks[3]; // Greek history chunk
    const extractor = relations({
      relations: 'Extract historical relationships, conflicts, and successions',
      predicates: ['succeeded by', 'fought against', 'ruled', 'founded', 'conquered'],
    });
    const result = await extractor(text);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  }, 15000);

  it('should map relations across chunks', async () => {
    const instructions = await mapInstructions({
      relations: 'Extract all business relationships',
      predicates: ['acquired', 'partnered with', 'competes with', 'invested in'],
      processing: 'Focus on merger and acquisition activities',
    });

    const results = await map(techChunks.slice(3, 6), instructions, {
      responseFormat: {
        type: 'json_schema',
        json_schema: {
          name: 'relation_result',
          schema: relationResultSchema,
        },
      },
    });

    expect(Array.isArray(results)).toBe(true);

    // Debug what we got
    console.log('Results:', JSON.stringify(results, null, 2));

    // Map returns an array of relations extracted from all chunks
    // Should find acquisition relations
    const acquisitions = results.filter(
      (rel) => rel && rel.predicate && rel.predicate.toLowerCase().includes('acquir')
    );
    expect(acquisitions.length).toBeGreaterThan(0);
  }, 20000);

  it('should reduce relations to unified knowledge graph', async () => {
    const instructions = await reduceInstructions({
      relations: 'Extract all company relationships',
      processing: 'Merge duplicate relations and build comprehensive relationship network',
      entities: [
        { name: 'Apple', canonical: 'Apple Inc.' },
        { name: 'Microsoft', canonical: 'Microsoft Corporation' },
        { name: 'Google', canonical: 'Google LLC' },
        { name: 'Amazon', canonical: 'Amazon.com Inc.' },
      ],
    });

    const consolidated = await reduce(techChunks.slice(0, 8), instructions, {
      initial: [],
      responseFormat: {
        type: 'json_schema',
        json_schema: {
          name: 'relation_result',
          schema: relationResultSchema,
        },
      },
    });

    // Reduce should return an array of relations
    expect(consolidated).toBeTruthy();
    expect(Array.isArray(consolidated)).toBe(true);
  }, 25000);

  it('should filter chunks by specific relations', async () => {
    const instructions = await filterInstructions({
      relations: 'Extract acquisition and investment relationships',
      processing: 'Keep only chunks mentioning acquisitions over $1 billion',
      predicates: ['acquired', 'purchased', 'bought'],
    });

    const filtered = await filter(techChunks.slice(0, 10), instructions);

    expect(Array.isArray(filtered)).toBe(true);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(10);
  }, 25000);

  it('should find chunk with most dense relationship network', async () => {
    const instructions = await findInstructions({
      relations: 'Extract all inter-company relationships',
      processing: 'Select chunk with highest density of relationships between entities',
    });

    const found = await find(techChunks.slice(0, 8), instructions);

    expect(typeof found).toBe('string');
    expect(found.length).toBeGreaterThan(0);
  }, 20000);

  it('should group chunks by relationship types', async () => {
    const instructions = await groupInstructions({
      relations: 'Extract business relationships',
      processing: 'Group by relationship type: partnerships vs acquisitions vs competition',
      predicates: ['partnered with', 'acquired', 'competes with', 'collaborated with'],
    });

    const grouped = await group(techChunks.slice(0, 10), instructions);

    expect(typeof grouped).toBe('object');
    expect(Object.keys(grouped).length).toBeGreaterThan(0);
  }, 25000);
});

describe('createRelationExtractor examples', () => {
  it('should create reusable extractor with entities', async () => {
    const entities = [
      { name: 'Alexander', canonical: 'Alexander the Great' },
      { name: 'Philip', canonical: 'Philip II of Macedon' },
      { name: 'Darius', canonical: 'Darius I' },
    ];

    const spec = await relationSpec({
      relations: 'Extract succession, conquest, and familial relationships',
      entities,
    });

    const extractor = createRelationExtractor(spec, { entities });

    const result1 = await extractor(historyChunks[5]);
    const result2 = await extractor(historyChunks[6]);

    expect(result1).toBeTruthy();
    expect(result2).toBeTruthy();
    expect(extractor.specification).toBe(spec);
  }, 20000);
});

describe('relationSpec and applyRelations examples', () => {
  it('should generate and apply relation specification', async () => {
    const spec = await relationSpec({
      relations: 'Extract ruler succession and territorial control',
      predicates: ['succeeded', 'ruled', 'conquered', 'founded'],
    });

    expect(typeof spec).toBe('string');
    expect(spec.length).toBeGreaterThan(0);

    const result = await applyRelations(historyChunks[7], spec);

    expect(result).toBeTruthy();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
  }, 15000);

  it('should handle complex metadata in relations', async () => {
    const text = techChunks[3]; // Amazon acquisition text
    const spec = await relationSpec({
      relations: 'Extract acquisitions with financial details',
      predicates: ['acquired', 'purchased'],
    });

    const result = await applyRelations(text, spec);

    expect(result).toBeTruthy();
    expect(Array.isArray(result.items)).toBe(true);
    // Check for acquisition with metadata
    const acquisition = result.items.find((r) => r.predicate.toLowerCase().includes('acquir'));
    if (acquisition && acquisition.metadata) {
      expect(acquisition.metadata).toBeTruthy();
    }
  }, 15000);
});
