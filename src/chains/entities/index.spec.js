import { describe, expect, it, vi, beforeEach } from 'vitest';
import entities, { entitySpec, applyEntities, createEntityExtractor } from './index.js';
import {
  mapInstructions,
  reduceInstructions,
  filterInstructions,
  groupInstructions,
  findInstructions,
} from './index.js';

// Mock the chatGPT module
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(),
}));

import chatGPT from '../../lib/chatgpt/index.js';

describe('entities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('entitySpec', () => {
    it('should generate entity specification from instructions', async () => {
      const mockSpec = `Entity Types:
- Person: Individual human beings (e.g., CEOs, employees, public figures)
- Company: Business organizations and corporations
- Location: Cities, countries, buildings, and geographical places

Extraction Rules:
- Include full names when available
- Capture titles or roles if mentioned with people
- Recognize common variations and abbreviations`;

      chatGPT.mockResolvedValueOnce(mockSpec);

      const spec = await entitySpec('Extract people, companies, and locations');

      expect(chatGPT).toHaveBeenCalledWith(
        expect.stringContaining('Extract people, companies, and locations'),
        expect.objectContaining({
          system: expect.stringContaining('entity specification generator'),
        })
      );
      expect(spec).toBe(mockSpec);
    });
  });

  describe('applyEntities', () => {
    it('should extract entities from text using specification', async () => {
      const spec = 'Extract companies and people';
      const text = "Tim Cook announced Apple's new partnership with Microsoft.";

      const mockResponse = {
        entities: [
          { name: 'Tim Cook', type: 'person' },
          { name: 'Apple', type: 'company' },
          { name: 'Microsoft', type: 'company' },
        ],
      };

      chatGPT.mockResolvedValueOnce(mockResponse);

      const result = await applyEntities(text, spec);

      expect(chatGPT).toHaveBeenCalledWith(expect.stringContaining(text), expect.any(Object));
      expect(result).toEqual(mockResponse);
    });
  });

  describe('extractEntities', () => {
    it('should extract entities with spec generation', async () => {
      const mockSpec = 'Specification for extracting companies';
      const mockEntities = {
        entities: [
          { name: 'Google', type: 'company' },
          { name: 'Amazon', type: 'company' },
        ],
      };

      chatGPT.mockResolvedValueOnce(mockSpec).mockResolvedValueOnce(mockEntities);

      const extractor = entities('Extract all companies');
      const result = await extractor('Google and Amazon are major tech companies.');

      expect(chatGPT).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockEntities);
    });
  });

  describe('instruction builders', () => {
    it('should create map instructions', async () => {
      const mockSpec = 'Entity specification';
      chatGPT.mockResolvedValueOnce(mockSpec);

      const instructions = await mapInstructions('Extract people');

      // Instructions are string-like objects with toString()
      expect(instructions.toString()).toContain('Extract entities from each text chunk');
      expect(instructions.specification).toBe(mockSpec);
    });

    it('should create reduce instructions with custom processing', async () => {
      const mockSpec = 'Entity specification';
      chatGPT.mockResolvedValueOnce(mockSpec);

      const instructions = await reduceInstructions({
        entities: 'Extract companies',
        processing: 'Merge all variations of company names',
      });

      expect(instructions.toString()).toContain('Merge all variations of company names');
      expect(instructions.toString()).toContain('Consolidate entities across text chunks');
      expect(instructions.specification).toBe(mockSpec);
    });

    it('should create filter instructions', async () => {
      const mockSpec = 'Entity specification';
      chatGPT.mockResolvedValueOnce(mockSpec);

      const instructions = await filterInstructions({
        entities: 'Extract locations',
        processing: 'Keep entities in Europe',
      });

      expect(instructions.toString()).toContain('Keep entities in Europe');
      expect(instructions.toString()).toContain('filter');
    });

    it('should create find instructions', async () => {
      const mockSpec = 'Entity specification';
      chatGPT.mockResolvedValueOnce(mockSpec);

      const instructions = await findInstructions({
        entities: 'Extract all entities',
        processing: 'Find the most mentioned entity',
      });

      expect(instructions.toString()).toContain('Find the most mentioned entity');
      expect(instructions.toString()).toContain('selection-criteria');
    });

    it('should create group instructions', async () => {
      const mockSpec = 'Entity specification';
      chatGPT.mockResolvedValueOnce(mockSpec);

      const instructions = await groupInstructions({
        entities: 'Extract organizations',
        processing: 'Group by industry sector',
      });

      expect(instructions.toString()).toContain('Group by industry sector');
      expect(instructions.toString()).toContain('grouping-strategy');
    });
  });

  describe('createEntityExtractor', () => {
    it('should create extractor with specification', async () => {
      const spec = 'Pre-generated specification';
      const extractor = createEntityExtractor(spec);

      expect(typeof extractor).toBe('function');
      expect(extractor.specification).toBe(spec);

      const mockEntities = { entities: [{ name: 'Test', type: 'test' }] };
      chatGPT.mockResolvedValueOnce(mockEntities);

      const result = await extractor('Test text');
      expect(result).toEqual(mockEntities);
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', async () => {
      chatGPT.mockResolvedValueOnce('Spec').mockResolvedValueOnce({ entities: [] });

      const extractor = entities('Extract any entities');
      const result = await extractor('');

      expect(result.entities).toEqual([]);
    });

    it('should handle backward compatibility for map instructions', async () => {
      chatGPT.mockResolvedValueOnce('Spec');

      // String input (backward compatible)
      const instructions1 = await mapInstructions('Extract companies');
      expect(instructions1.toString()).toBeTruthy();

      // Object input
      const instructions2 = await mapInstructions({
        entities: 'Extract companies',
        processing: 'Additional processing',
      });
      expect(instructions2.toString()).toContain('Additional processing');
    });

    it('should return tuple when configured', async () => {
      chatGPT.mockResolvedValueOnce('Test spec');

      const result = await mapInstructions('Extract entities', { returnTuple: true });

      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('specification');
      expect(result.specification).toBe('Test spec');
    });
  });
});
