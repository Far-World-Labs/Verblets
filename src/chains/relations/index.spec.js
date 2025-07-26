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
} from './index.js';

// Mock the chatGPT module
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((prompt, config) => {
    // For debugging - uncomment to see what's being called
    // console.log('Mock chatGPT called with:', {
    //   promptSnippet: prompt.substring(0, 100),
    //   hasModelOptions: !!config?.modelOptions,
    //   responseFormat: config?.modelOptions?.response_format?.type,
    //   schemaName: config?.modelOptions?.response_format?.json_schema?.name
    // });

    // Check for relation extraction with JSON schema first (more specific)
    if (
      config?.modelOptions?.response_format?.type === 'json_schema' &&
      config?.modelOptions?.response_format?.json_schema?.name === 'relation_result'
    ) {
      // Return array directly (simulating auto-unwrapping of items property)
      return Promise.resolve([
        { subject: 'Apple', predicate: 'partnered with', object: 'Microsoft' },
        { subject: 'CEO', predicate: 'manages', object: 'company' },
        { subject: 'John', predicate: 'works for', object: 'Microsoft' },
        { subject: 'Amazon', predicate: 'acquired', object: 'Whole Foods' },
        { subject: 'Google', predicate: 'competes with', object: 'Apple' },
        { subject: 'Microsoft', predicate: 'acquired', object: 'GitHub' },
      ]);
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

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should use provided entities for disambiguation', async () => {
      const spec = await relationSpec('Extract employment relationships');
      const text = 'The CEO leads the company. He reports to the board.';
      const entities = [
        { name: 'CEO', canonical: 'Chief Executive Officer' },
        { name: 'He', canonical: 'Chief Executive Officer' },
      ];
      const result = await applyRelations(text, spec, { entities });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
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
      it('should create map instructions from string', async () => {
        const instructions = await mapInstructions('Extract all relationships');
        expect(instructions.specification).toBeTruthy();
        expect(String(instructions)).toContain('relation-specification');
      });

      it('should handle complex instruction object', async () => {
        const instructions = await mapInstructions({
          relations: 'Extract business relationships',
          processing: 'Focus on partnerships and acquisitions',
          entities: [{ name: 'Apple', canonical: 'Apple Inc.' }],
        });
        expect(instructions.specification).toBeTruthy();
        expect(String(instructions)).toContain('relation-specification');
      });

      it('should return tuple when configured', async () => {
        const result = await mapInstructions('Extract relationships', { returnTuple: true });
        expect(typeof result).toBe('object');
        expect(result).toHaveProperty('value');
        expect(result).toHaveProperty('specification');
        expect(typeof result.value).toBe('string');
        expect(typeof result.specification).toBe('string');
      });
    });

    describe('filterInstructions', () => {
      it('should create filter instructions', async () => {
        const instructions = await filterInstructions({
          relations: 'Extract employment relationships',
          processing: 'Keep only C-level relationships',
        });
        expect(instructions.specification).toBeTruthy();
        expect(String(instructions)).toContain('relation-specification');
      });
    });

    describe('reduceInstructions', () => {
      it('should create reduce instructions', async () => {
        const instructions = await reduceInstructions({
          relations: 'Extract all relationships',
          processing: 'Build unified knowledge graph',
        });
        expect(instructions.specification).toBeTruthy();
        expect(String(instructions)).toContain('relation-specification');
      });

      it('should use default processing when not provided', async () => {
        const instructions = await reduceInstructions({
          relations: 'Extract company relationships',
        });
        expect(instructions.specification).toBeTruthy();
        expect(String(instructions)).toContain('comprehensive relation graph');
      });
    });

    describe('findInstructions', () => {
      it('should create find instructions', async () => {
        const instructions = await findInstructions({
          relations: 'Extract conflict relationships',
          processing: 'Find most contentious section',
        });
        expect(instructions.specification).toBeTruthy();
        expect(String(instructions)).toContain('relation-specification');
      });
    });

    describe('groupInstructions', () => {
      it('should create group instructions', async () => {
        const instructions = await groupInstructions({
          relations: 'Extract all relationships',
          processing: 'Group by relationship type',
        });
        expect(instructions.specification).toBeTruthy();
        expect(String(instructions)).toContain('relation-specification');
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
});
