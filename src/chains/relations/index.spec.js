import { describe, expect, it, vi } from 'vitest';
import extractRelations, {
  relationSpec,
  relationInstructions,
  parseRDFLiteral,
  parseRelations,
} from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn().mockImplementation((prompt, config) => {
    // Relation extraction with JSON schema
    if (config?.responseFormat?.json_schema?.name === 'relation_result') {
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

    // Spec generation
    if (
      prompt.includes('relation specification') ||
      prompt.includes('Analyze these relation extraction instructions')
    ) {
      return Promise.resolve('Extract subject-predicate-object relationships from text');
    }

    return Promise.resolve('Mock response');
  }),
}));

describe('relations', () => {
  describe('relationSpec', () => {
    it('generates spec from string instructions', async () => {
      const spec = await relationSpec('Extract causal relationships');
      expect(spec).toBe('Extract subject-predicate-object relationships from text');
    });

    it('handles object instructions with entities and predicates', async () => {
      const spec = await relationSpec({
        relations: 'Extract business relationships',
        entities: [{ name: 'Apple', canonical: 'Apple Inc.' }],
        predicates: ['manages', 'reports to'],
      });
      expect(spec).toBe('Extract subject-predicate-object relationships from text');
    });
  });

  describe('extractRelations', () => {
    it('combines spec generation and extraction', async () => {
      const result = await extractRelations(
        'Amazon acquired Whole Foods for $13.7 billion.',
        'Extract acquisitions'
      );
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('relationInstructions', () => {
    it('returns instruction bundle with spec', () => {
      const bundle = relationInstructions({ spec: 'Relation specification' });

      expect(bundle.text).toContain('relation specification');
      expect(bundle.spec).toBe('Relation specification');
    });

    it('passes through additional context keys', () => {
      const bundle = relationInstructions({ spec: 'spec', entityContext: 'known entities' });

      expect(bundle.entityContext).toBe('known entities');
    });
  });

  describe('RDF literal parsing', () => {
    it('parses typed literals', () => {
      expect(parseRDFLiteral('42^^xsd:integer')).toBe(42);
      expect(parseRDFLiteral('-100^^xsd:int')).toBe(-100);
      expect(parseRDFLiteral('3.14^^xsd:decimal')).toBe(3.14);
      expect(parseRDFLiteral('1.5e10^^xsd:double')).toBe(1.5e10);
      expect(parseRDFLiteral('true^^xsd:boolean')).toBe(true);
      expect(parseRDFLiteral('false^^xsd:boolean')).toBe(false);
      expect(parseRDFLiteral('hello world^^xsd:string')).toBe('hello world');
    });

    it('parses date literals', () => {
      const date = parseRDFLiteral('2024-01-15^^xsd:date');
      expect(date instanceof Date).toBe(true);
      expect(date.toISOString()).toBe('2024-01-15T00:00:00.000Z');

      const dateTime = parseRDFLiteral('2024-01-15T14:30:00Z^^xsd:dateTime');
      expect(dateTime.toISOString()).toBe('2024-01-15T14:30:00.000Z');
    });

    it('returns non-RDF values unchanged', () => {
      expect(parseRDFLiteral('Apple Inc.')).toBe('Apple Inc.');
      expect(parseRDFLiteral(42)).toBe(42);
      expect(parseRDFLiteral(null)).toBe(null);
      expect(parseRDFLiteral(undefined)).toBe(undefined);
    });
  });

  describe('parseRelations', () => {
    it('parses RDF literals in object and metadata fields', () => {
      const parsed = parseRelations([
        { subject: 'Apple', predicate: 'has revenue', object: '383000000000^^xsd:decimal' },
        { subject: 'Tim Cook', predicate: 'is CEO', object: 'true^^xsd:boolean' },
        {
          subject: 'Apple',
          predicate: 'acquired',
          object: 'Beats',
          metadata: {
            price: '3000000000^^xsd:decimal',
            year: '2014^^xsd:integer',
          },
        },
      ]);

      expect(parsed[0].object).toBe(383000000000);
      expect(parsed[1].object).toBe(true);
      expect(parsed[2].metadata.price).toBe(3000000000);
      expect(parsed[2].metadata.year).toBe(2014);
    });

    it('leaves entity references unchanged', () => {
      const parsed = parseRelations([
        { subject: 'Apple Inc.', predicate: 'competes with', object: 'Microsoft Corporation' },
      ]);
      expect(parsed[0].object).toBe('Microsoft Corporation');
    });
  });
});
