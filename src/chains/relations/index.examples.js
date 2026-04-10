import { describe } from 'vitest';
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
import { jsonSchema } from '../../lib/llm/index.js';
import { techCompanyArticle, historicalNarrative } from '../entities/sample-text.js';
import relationResultSchema from './relation-result.json' with { type: 'json' };
import {
  longTestTimeout,
  extendedTestTimeout,
  isMediumBudget,
  isHighBudget,
} from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Relations examples');

const techChunks = techCompanyArticle.split('\n\n').filter((chunk) => chunk.trim().length > 0);
const historyChunks = historicalNarrative.split('\n\n').filter((chunk) => chunk.trim().length > 0);

// Each chain operation test below exercises a different entity-aware instruction generator
// (mapInstructions, reduceInstructions, etc.) with relation-specific semantics:
// structured output via JSON schema, entity canonicalization, predicate matching.
describe.skipIf(!isHighBudget)('[high] relations examples', () => {
  it(
    'extracts business relations from text',
    async () => {
      const text = techChunks[1];
      const extractor = relations('Extract business relationships and partnerships');
      const result = await extractor(text);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const partnershipRelation = result.find(
        (r) =>
          r.predicate.toLowerCase().includes('partner') ||
          r.predicate.toLowerCase().includes('collaborat')
      );
      expect(partnershipRelation).toBeTruthy();
    },
    longTestTimeout
  );

  it(
    'extracts relations with primitive values (numbers, dates)',
    async () => {
      const text = `Apple reported revenue of $394.3 billion in fiscal year 2022.
    The company was founded on April 1, 1976.
    Apple has 164,000 employees worldwide.`;

      const extractor = relations({
        relations: 'Extract company metrics and dates as precise values',
        predicates: ['revenue', 'founded on', 'employee count'],
      });
      const result = await extractor(text);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const revenueRelation = result.find((r) => r.predicate.includes('revenue'));
      if (revenueRelation) {
        expect(typeof revenueRelation.object).toBe('number');
        expect(revenueRelation.object).toBeGreaterThan(300);
      }
    },
    longTestTimeout
  );

  it(
    'maps relations with structured output schema',
    async () => {
      const spec = await relationSpec({
        relations: 'Extract all business relationships',
        predicates: ['acquired', 'partnered with', 'competes with', 'invested in'],
      });

      const instructions = mapInstructions({
        specification: spec,
        processing: 'Focus on merger and acquisition activities',
      });

      const results = await map(techChunks.slice(3, 6), instructions, {
        responseFormat: jsonSchema('relation_result', relationResultSchema),
      });

      expect(Array.isArray(results)).toBe(true);

      const acquisitions = results.filter(
        (rel) => rel && rel.predicate && rel.predicate.toLowerCase().includes('acquir')
      );
      expect(acquisitions.length).toBeGreaterThan(0);
    },
    extendedTestTimeout
  );

  it(
    'reduces relations with entity canonicalization',
    async () => {
      const spec = await relationSpec({
        relations: 'Extract all company relationships',
        entities: [
          { name: 'Apple', canonical: 'Apple Inc.' },
          { name: 'Microsoft', canonical: 'Microsoft Corporation' },
          { name: 'Google', canonical: 'Google LLC' },
          { name: 'Amazon', canonical: 'Amazon.com Inc.' },
        ],
      });

      const instructions = reduceInstructions({
        specification: spec,
        processing: 'Merge duplicate relations and build comprehensive relationship network',
      });

      const consolidated = await reduce(techChunks.slice(0, 8), instructions, {
        initial: [],
        responseFormat: jsonSchema('relation_result', relationResultSchema),
      });

      expect(consolidated).toBeTruthy();
      expect(Array.isArray(consolidated)).toBe(true);
    },
    longTestTimeout
  );

  it(
    'filters chunks by predicate-specific relations',
    async () => {
      const spec = await relationSpec({
        relations: 'Extract acquisition and investment relationships',
        predicates: ['acquired', 'purchased', 'bought'],
      });

      const instructions = filterInstructions({
        specification: spec,
        processing: 'Keep only chunks mentioning acquisitions over $1 billion',
      });

      const filtered = await filter(techChunks.slice(0, 10), instructions);

      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.length).toBeLessThan(10);
    },
    longTestTimeout
  );

  it(
    'finds densest relationship network chunk',
    async () => {
      const spec = await relationSpec({
        relations: 'Extract all inter-company relationships',
      });

      const instructions = findInstructions({
        specification: spec,
        processing: 'Select chunk with highest density of relationships between entities',
      });

      const found = await find(techChunks.slice(0, 8), instructions);

      expect(typeof found).toBe('string');
      expect(found.length).toBeGreaterThan(0);
    },
    longTestTimeout
  );

  it(
    'groups chunks by relationship types',
    async () => {
      const spec = await relationSpec({
        relations: 'Extract business relationships',
        predicates: ['partnered with', 'acquired', 'competes with', 'collaborated with'],
      });

      const instructions = groupInstructions({
        specification: spec,
        processing: 'Group by relationship type: partnerships vs acquisitions vs competition',
      });

      const grouped = await group(techChunks.slice(0, 10), instructions);

      expect(typeof grouped).toBe('object');
      expect(Object.keys(grouped).length).toBeGreaterThan(0);
    },
    longTestTimeout
  );
});

describe.skipIf(!isMediumBudget)('[medium] createRelationExtractor examples', () => {
  it(
    'creates reusable extractor with entity disambiguation',
    async () => {
      const entityList = [
        { name: 'Alexander', canonical: 'Alexander the Great' },
        { name: 'Philip', canonical: 'Philip II of Macedon' },
        { name: 'Darius', canonical: 'Darius I' },
      ];

      const spec = await relationSpec({
        relations: 'Extract succession, conquest, and familial relationships',
        entities: entityList,
      });

      const extractor = createRelationExtractor(spec, { entities: entityList });

      const result1 = await extractor(historyChunks[5]);
      const result2 = await extractor(historyChunks[6]);

      expect(result1).toBeTruthy();
      expect(result2).toBeTruthy();
      expect(extractor.specification).toBe(spec);
    },
    longTestTimeout
  );
});

describe.skipIf(!isMediumBudget)('[medium] relationSpec and applyRelations', () => {
  it(
    'generates and applies relation specification',
    async () => {
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

      await aiExpect(result.items).toSatisfy(
        'Historical relations about rulers, succession, or territorial control'
      );
    },
    longTestTimeout
  );

  it(
    'extracts acquisitions with financial metadata',
    async () => {
      const text = techChunks[3];
      const spec = await relationSpec({
        relations: 'Extract acquisitions with financial details',
        predicates: ['acquired', 'purchased'],
      });

      const result = await applyRelations(text, spec);

      expect(result).toBeTruthy();
      expect(Array.isArray(result.items)).toBe(true);

      const acquisition = result.items.find((r) => r.predicate.toLowerCase().includes('acquir'));
      if (acquisition && acquisition.metadata) {
        expect(acquisition.metadata).toBeTruthy();
      }
    },
    longTestTimeout
  );
});
