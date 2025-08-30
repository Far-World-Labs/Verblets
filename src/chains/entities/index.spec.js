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
    it('should create map instructions', () => {
      const mockSpec = 'Entity specification';

      const instructions = mapInstructions({ specification: mockSpec });

      expect(instructions).toContain('Extract entities from each text chunk');
      expect(instructions).toContain(mockSpec);
    });

    it('should create reduce instructions with custom processing', () => {
      const mockSpec = 'Entity specification';

      const instructions = reduceInstructions({
        specification: mockSpec,
        processing: 'Merge all variations of company names',
      });

      expect(instructions).toContain('Merge all variations of company names');
      expect(instructions).toContain('Consolidate entities across text chunks');
      expect(instructions).toContain(mockSpec);
    });

    it('should create filter instructions', () => {
      const mockSpec = 'Entity specification';

      const instructions = filterInstructions({
        specification: mockSpec,
        processing: 'Keep entities in Europe',
      });

      expect(instructions).toContain('Keep entities in Europe');
      expect(instructions).toContain('filter');
    });

    it('should create find instructions', () => {
      const mockSpec = 'Entity specification';

      const instructions = findInstructions({
        specification: mockSpec,
        processing: 'Find the most mentioned entity',
      });

      expect(instructions).toContain('Find the most mentioned entity');
      expect(instructions).toContain('selection-criteria');
    });

    it('should create group instructions', () => {
      const mockSpec = 'Entity specification';

      const instructions = groupInstructions({
        specification: mockSpec,
        processing: 'Group by industry sector',
      });

      expect(instructions).toContain('Group by industry sector');
      expect(instructions).toContain('grouping-strategy');
    });
  });

  describe('createEntityExtractor', () => {
    it('should create extractor with specification', async () => {
      const spec = 'Pre-generated specification';
      const extractor = createEntityExtractor(spec);

      expect(typeof extractor).toBe('function');
      expect(extractor.specification).toBe(spec);

      const mockEntities = { entities: [{ name: 'Test', type: 'test' }] };
      // The extractor calls applyEntities which calls chatGPT once
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

    it('should handle map instructions', () => {
      const spec = 'Entity specification';

      // Without processing
      const instructions1 = mapInstructions({ specification: spec });
      expect(instructions1).toBeTruthy();
      expect(instructions1).toContain(spec);

      // With processing
      const instructions2 = mapInstructions({
        specification: spec,
        processing: 'Additional processing',
      });
      expect(instructions2).toContain('Additional processing');
      expect(instructions2).toContain(spec);
    });

    it('should create proper instructions', () => {
      const spec = 'Test spec';

      const result = mapInstructions({ specification: spec });

      expect(result).toContain(spec);
      expect(result).toContain('entity-specification');
    });
  });
});
