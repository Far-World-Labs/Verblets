import { describe, expect, it, vi } from 'vitest';
import relations, {
  relationSpec,
  applyRelations,
  extractRelations,
  createRelationExtractor,
  mapInstructions,
  filterInstructions,
  reduceInstructions,
  findInstructions,
  groupInstructions,
  parseRDFLiteral,
  parseRelations,
} from './index.js';
import { debug } from '../../lib/debug/index.js';

// Mock the chatGPT module
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((prompt, config) => {
    // For debugging - uncomment to see what's being called
    debug('Mock chatGPT called with:', {
      promptSnippet: prompt.substring(0, 100),
      hasModelOptions: !!config?.modelOptions,
      responseFormat: config?.modelOptions?.response_format?.type,
      schemaName: config?.modelOptions?.response_format?.json_schema?.name,
    });

    // Check for relation extraction with JSON schema first (more specific)
    if (
      config?.modelOptions?.response_format?.type === 'json_schema' &&
      config?.modelOptions?.response_format?.json_schema?.name === 'relation_result'
    ) {
      // Return object with items array (as the actual API would)
      return Promise.resolve({
        items: [
          { subject: 'Apple', predicate: 'partnered with', object: 'Microsoft' },
          { subject: 'CEO', predicate: 'manages', object: 'company' },
          { subject: 'John', predicate: 'works for', object: 'Microsoft' },
          { subject: 'Amazon', predicate: 'acquired', object: 'Whole Foods' },
          { subject: 'Google', predicate: 'competes with', object: 'Apple' },
          { subject: 'Microsoft', predicate: 'acquired', object: 'GitHub' },
        ],
      });
    }

    // Return mock responses based on the prompt content
    if (
      prompt.includes('relation specification') ||
      prompt.includes('Analyze these relation extraction instructions')
    ) {
      return Promise.resolve('Extract subject-predicate-object relationships from text');
    }

    // Default fallback
    return Promise.resolve('Mock response - no conditions matched');
  }),
}));

describe('relations', () => {
  describe('relationSpec', () => {
    it('should generate a relation specification from string instructions', async () => {
      const spec = await relationSpec('Extract causal relationships');
      expect(typeof spec).toBe('string');
      expect(spec.length).toBeGreaterThan(10);
    });

    it('should handle object instructions with entities', async () => {
      const spec = await relationSpec({
        relations: 'Extract business relationships',
        entities: [
          { name: 'Apple', canonical: 'Apple Inc.' },
          { name: 'Microsoft', canonical: 'Microsoft Corporation' },
        ],
      });
      expect(typeof spec).toBe('string');
      expect(spec.length).toBeGreaterThan(10);
    });

    it('should handle specific predicates', async () => {
      const spec = await relationSpec({
        relations: 'Extract organizational relationships',
        predicates: ['manages', 'reports to', 'works with'],
      });
      expect(typeof spec).toBe('string');
      expect(spec.length).toBeGreaterThan(10);
    });
  });

  describe('applyRelations', () => {
    it('should extract relations from text', async () => {
      const spec = await relationSpec('Extract all relationships');
      const text = 'John works for Microsoft. Microsoft partnered with Apple.';
      const result = await applyRelations(text, spec);

      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should use provided entities for disambiguation', async () => {
      const spec = await relationSpec('Extract employment relationships');
      const text = 'The CEO leads the company. He reports to the board.';
      const entities = [
        { name: 'CEO', canonical: 'Chief Executive Officer' },
        { name: 'He', canonical: 'Chief Executive Officer' },
      ];
      const result = await applyRelations(text, spec, { entities });

      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
    });
  });

  describe('extractRelations', () => {
    it('should combine spec generation and application', async () => {
      const text = 'Amazon acquired Whole Foods for $13.7 billion.';
      const result = await extractRelations(text, 'Extract acquisitions');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle complex instructions object', async () => {
      const text = 'Google competes with Apple in mobile. Both invest in AI.';
      const result = await extractRelations(text, {
        relations: 'Extract competition and investment relationships',
        entities: [
          { name: 'Google', canonical: 'Google LLC' },
          { name: 'Apple', canonical: 'Apple Inc.' },
        ],
        predicates: ['competes with', 'invests in'],
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('createRelationExtractor', () => {
    it('should create a reusable extractor function', async () => {
      const spec = await relationSpec('Extract leadership relationships');
      const extractor = createRelationExtractor(spec);

      expect(typeof extractor).toBe('function');
      expect(extractor.specification).toBe(spec);

      const result = await extractor('The CEO manages the company.');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should pass entities config to extractor', async () => {
      const spec = await relationSpec('Extract organizational relationships');
      const entities = [{ name: 'CEO', canonical: 'Chief Executive Officer' }];
      const extractor = createRelationExtractor(spec, { entities });

      const result = await extractor('The CEO oversees operations.');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('default function', () => {
    it('should create a stateless extractor', async () => {
      const extractor = relations('Extract all relationships');

      expect(typeof extractor).toBe('function');
      expect(extractor.prompt).toBe('Extract all relationships');

      const result = await extractor('Microsoft acquired GitHub.');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle object prompts', async () => {
      const extractor = relations({
        relations: 'Extract financial relationships',
        predicates: ['invested in', 'acquired', 'funded'],
      });

      expect(typeof extractor).toBe('function');
      expect(typeof extractor.prompt).toBe('object');
    });
  });

  describe('instruction builders', () => {
    describe('mapInstructions', () => {
      it('should create map instructions from string', () => {
        const spec = 'Relation specification';
        const instructions = mapInstructions({ specification: spec });
        expect(instructions).toContain(spec);
        expect(instructions).toContain('relation-specification');
      });

      it('should handle complex instruction object', () => {
        const spec = 'Relation specification';
        const instructions = mapInstructions({
          specification: spec,
          processing: 'Focus on partnerships and acquisitions',
        });
        expect(instructions).toContain(spec);
        expect(instructions).toContain('relation-specification');
        expect(instructions).toContain('Focus on partnerships');
      });

      it('should create proper instructions', () => {
        const spec = 'Relation specification';
        const result = mapInstructions({ specification: spec });
        expect(typeof result).toBe('string');
        expect(result).toContain(spec);
        expect(result).toContain('relation-specification');
      });
    });

    describe('filterInstructions', () => {
      it('should create filter instructions', () => {
        const spec = 'Relation specification';
        const instructions = filterInstructions({
          specification: spec,
          processing: 'Keep only C-level relationships',
        });
        expect(instructions).toContain(spec);
        expect(instructions).toContain('relation-specification');
        expect(instructions).toContain('C-level relationships');
      });
    });

    describe('reduceInstructions', () => {
      it('should create reduce instructions', () => {
        const spec = 'Relation specification';
        const instructions = reduceInstructions({
          specification: spec,
          processing: 'Build unified knowledge graph',
        });
        expect(instructions).toContain(spec);
        expect(instructions).toContain('relation-specification');
        expect(instructions).toContain('unified knowledge graph');
      });

      it('should use default processing when not provided', () => {
        const spec = 'Relation specification';
        const instructions = reduceInstructions({
          specification: spec,
        });
        expect(instructions).toContain(spec);
        expect(instructions).toContain('comprehensive relation graph');
      });
    });

    describe('findInstructions', () => {
      it('should create find instructions', () => {
        const spec = 'Relation specification';
        const instructions = findInstructions({
          specification: spec,
          processing: 'Find most contentious section',
        });
        expect(instructions).toContain(spec);
        expect(instructions).toContain('relation-specification');
        expect(instructions).toContain('contentious section');
      });
    });

    describe('groupInstructions', () => {
      it('should create group instructions', () => {
        const spec = 'Relation specification';
        const instructions = groupInstructions({
          specification: spec,
          processing: 'Group by relationship type',
        });
        expect(instructions).toContain(spec);
        expect(instructions).toContain('relation-specification');
        expect(instructions).toContain('relationship type');
      });
    });
  });

  describe('relation tuple structure', () => {
    it('should validate tuple format', async () => {
      const extractor = relations('Extract simple relationships');
      const result = await extractor('Apple partnered with IBM.');

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        const relation = result[0];
        expect(relation).toHaveProperty('subject');
        expect(relation).toHaveProperty('predicate');
        expect(relation).toHaveProperty('object');
        // metadata is optional
      }
    });
  });

  describe('RDF literal parsing', () => {
    describe('parseRDFLiteral', () => {
      it('should parse integer literals', () => {
        expect(parseRDFLiteral('42^^xsd:integer')).toBe(42);
        expect(parseRDFLiteral('-100^^xsd:int')).toBe(-100);
      });

      it('should parse decimal/float literals', () => {
        expect(parseRDFLiteral('3.14^^xsd:decimal')).toBe(3.14);
        expect(parseRDFLiteral('1.5e10^^xsd:double')).toBe(1.5e10);
        expect(parseRDFLiteral('-0.5^^xsd:float')).toBe(-0.5);
      });

      it('should parse boolean literals', () => {
        expect(parseRDFLiteral('true^^xsd:boolean')).toBe(true);
        expect(parseRDFLiteral('false^^xsd:boolean')).toBe(false);
      });

      it('should parse date literals', () => {
        const date = parseRDFLiteral('2024-01-15^^xsd:date');
        expect(date instanceof Date).toBe(true);
        expect(date.toISOString()).toBe('2024-01-15T00:00:00.000Z');
      });

      it('should parse dateTime literals', () => {
        const dateTime = parseRDFLiteral('2024-01-15T14:30:00Z^^xsd:dateTime');
        expect(dateTime instanceof Date).toBe(true);
        expect(dateTime.toISOString()).toBe('2024-01-15T14:30:00.000Z');
      });

      it('should parse string literals', () => {
        expect(parseRDFLiteral('hello world^^xsd:string')).toBe('hello world');
      });

      it('should return non-RDF strings unchanged', () => {
        expect(parseRDFLiteral('Apple Inc.')).toBe('Apple Inc.');
        expect(parseRDFLiteral('just a plain string')).toBe('just a plain string');
      });

      it('should handle non-string inputs', () => {
        expect(parseRDFLiteral(42)).toBe(42);
        expect(parseRDFLiteral(null)).toBe(null);
        expect(parseRDFLiteral(undefined)).toBe(undefined);
      });
    });

    describe('parseRelations', () => {
      it('should parse RDF literals in object field', () => {
        const relations = [
          { subject: 'Apple', predicate: 'has revenue', object: '383000000000^^xsd:decimal' },
          { subject: 'Tim Cook', predicate: 'is CEO', object: 'true^^xsd:boolean' },
          { subject: 'iPhone', predicate: 'released on', object: '2007-06-29^^xsd:date' },
        ];

        const parsed = parseRelations(relations);

        expect(parsed[0].object).toBe(383000000000);
        expect(parsed[1].object).toBe(true);
        expect(parsed[2].object instanceof Date).toBe(true);
      });

      it('should parse RDF literals in metadata', () => {
        const relations = [
          {
            subject: 'Apple',
            predicate: 'acquired',
            object: 'Beats',
            metadata: {
              price: '3000000000^^xsd:decimal',
              year: '2014^^xsd:integer',
              completed: 'true^^xsd:boolean',
            },
          },
        ];

        const parsed = parseRelations(relations);

        expect(parsed[0].metadata.price).toBe(3000000000);
        expect(parsed[0].metadata.year).toBe(2014);
        expect(parsed[0].metadata.completed).toBe(true);
      });

      it('should leave entity references unchanged', () => {
        const relations = [
          { subject: 'Apple Inc.', predicate: 'competes with', object: 'Microsoft Corporation' },
          { subject: 'Steve Jobs', predicate: 'founded', object: 'Apple Inc.' },
        ];

        const parsed = parseRelations(relations);

        expect(parsed[0].object).toBe('Microsoft Corporation');
        expect(parsed[1].object).toBe('Apple Inc.');
      });
    });
  });
});
