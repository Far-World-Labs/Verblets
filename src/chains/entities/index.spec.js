import { describe, expect, it, vi, beforeEach } from 'vitest';
import entities, { entitySpec, applyEntities, createEntityExtractor } from './index.js';
import {
  mapInstructions,
  reduceInstructions,
  filterInstructions,
  groupInstructions,
  findInstructions,
} from './index.js';
import { testInstructionBuilders } from '../../lib/test-utils/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

import llm from '../../lib/llm/index.js';

describe('entities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('entitySpec', () => {
    it('generates entity specification from instructions', async () => {
      const mockSpec = 'Extract people, companies, and locations';
      llm.mockResolvedValueOnce(mockSpec);

      const spec = await entitySpec('Extract people, companies, and locations');

      expect(llm).toHaveBeenCalledWith(
        expect.stringContaining('Extract people, companies, and locations'),
        expect.objectContaining({
          systemPrompt: expect.stringContaining('entity specification generator'),
        })
      );
      expect(spec).toBe(mockSpec);
    });
  });

  describe('applyEntities', () => {
    it('extracts entities from text using specification', async () => {
      const mockResponse = {
        entities: [
          { name: 'Tim Cook', type: 'person' },
          { name: 'Apple', type: 'company' },
          { name: 'Microsoft', type: 'company' },
        ],
      };
      llm.mockResolvedValueOnce(mockResponse);

      const result = await applyEntities(
        "Tim Cook announced Apple's new partnership with Microsoft.",
        'Extract companies and people'
      );

      expect(llm).toHaveBeenCalledWith(expect.stringContaining('Tim Cook'), expect.any(Object));
      expect(result).toEqual(mockResponse);
    });
  });

  describe('extractEntities (default export)', () => {
    it('chains spec generation and extraction', async () => {
      llm.mockResolvedValueOnce('Specification for extracting companies').mockResolvedValueOnce({
        entities: [
          { name: 'Google', type: 'company' },
          { name: 'Amazon', type: 'company' },
        ],
      });

      const extractor = entities('Extract all companies');
      const result = await extractor('Google and Amazon are major tech companies.');

      expect(llm).toHaveBeenCalledTimes(2);
      expect(result.entities).toHaveLength(2);
    });

    it('handles empty text', async () => {
      llm.mockResolvedValueOnce('Spec').mockResolvedValueOnce({ entities: [] });

      const extractor = entities('Extract any entities');
      const result = await extractor('');

      expect(result.entities).toEqual([]);
    });
  });

  describe('createEntityExtractor', () => {
    it('creates reusable extractor with pre-generated spec', async () => {
      const spec = 'Pre-generated specification';
      const extractor = createEntityExtractor(spec);

      expect(extractor.specification).toBe(spec);

      const mockEntities = { entities: [{ name: 'Test', type: 'test' }] };
      llm.mockResolvedValueOnce(mockEntities);

      const result = await extractor('Test text');
      expect(result).toEqual(mockEntities);
    });
  });

  testInstructionBuilders(
    {
      mapInstructions,
      filterInstructions,
      reduceInstructions,
      findInstructions,
      groupInstructions,
    },
    {
      specTag: 'entity-specification',
      specification: 'Entity specification',
      xmlTags: {
        filter: 'filter-criteria',
        find: 'selection-criteria',
        group: 'grouping-strategy',
      },
    }
  );
});
