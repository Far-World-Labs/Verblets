import { describe, expect, it, vi, beforeEach } from 'vitest';
import tags, {
  tagSpec,
  applyTags,
  tagItem,
  mapTags,
  createTagExtractor,
  createTagger,
  mapInstructions,
  filterInstructions,
  reduceInstructions,
  findInstructions,
  groupInstructions,
} from './index.js';
import { testInstructionBuilders } from '../../lib/test-utils/index.js';

// Mock the dependencies
vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../map/index.js', () => ({
  default: vi.fn(),
}));

import llm from '../../lib/llm/index.js';
import map from '../map/index.js';

describe('tags', () => {
  const mockVocabulary = {
    tags: [
      { id: 'urgent', label: 'Urgent', description: 'Requires immediate attention' },
      { id: 'financial', label: 'Financial', description: 'Related to money or finances' },
      { id: 'personal', label: 'Personal', description: 'Personal matters' },
    ],
    facet: 'task categories',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tagSpec', () => {
    it('should generate tag specification from instructions', async () => {
      const mockSpec = 'Tag items based on urgency and category';
      llm.mockResolvedValueOnce(mockSpec);

      const spec = await tagSpec('Tag by priority and type');

      expect(llm).toHaveBeenCalledWith(
        expect.stringContaining('Tag by priority and type'),
        expect.objectContaining({
          systemPrompt: expect.stringContaining('tag specification generator'),
        })
      );
      expect(spec).toBe(mockSpec);
    });
  });

  describe('applyTags', () => {
    it('should apply tags to an item', async () => {
      // llm auto-unwraps {items: [...]} to just the array
      llm.mockResolvedValueOnce(['urgent', 'financial']);

      const item = 'Pay credit card bill today';
      const spec = 'Tag based on urgency and category';

      const result = await applyTags(item, spec, mockVocabulary);

      expect(llm).toHaveBeenCalledWith(
        expect.stringContaining(item),
        expect.objectContaining({
          response_format: expect.objectContaining({
            type: 'json_schema',
          }),
        })
      );
      expect(result).toEqual(['urgent', 'financial']);
    });

    it('should handle empty tag arrays', async () => {
      // llm auto-unwraps {items: [...]} to just the array
      llm.mockResolvedValueOnce([]);

      const result = await applyTags('Random note', 'spec', mockVocabulary);
      expect(result).toEqual([]);
    });
  });

  describe('tagItem', () => {
    it('should tag a single item with spec generation', async () => {
      const mockSpec = 'Generated spec';
      const mockTags = ['personal'];

      llm
        .mockResolvedValueOnce(mockSpec) // tagSpec
        .mockResolvedValueOnce(mockTags); // applyTags - auto-unwrapped

      const result = await tagItem('Call mom', 'Tag personal items', mockVocabulary);

      expect(llm).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockTags);
    });
  });

  describe('mapTags', () => {
    it('should tag multiple items', async () => {
      const mockSpec = 'Generated spec';
      const mockResults = [['urgent'], ['financial', 'personal'], []];

      llm.mockResolvedValueOnce(mockSpec); // tagSpec
      map.mockResolvedValueOnce(mockResults); // map operation

      const items = ['Task 1', 'Task 2', 'Task 3'];
      const result = await mapTags(items, 'Tag all tasks', mockVocabulary);

      expect(llm).toHaveBeenCalledTimes(1);
      expect(map).toHaveBeenCalledWith(
        items,
        expect.any(String),
        expect.objectContaining({
          responseFormat: expect.objectContaining({
            type: 'json_schema',
          }),
        })
      );
      expect(result).toEqual(mockResults);
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
      specTag: 'tag-specification',
      specification: 'Test spec',
      extraArgs: { vocabulary: mockVocabulary },
      xmlTags: { filter: 'filter-criteria' },
    }
  );

  describe('instruction builders — throw on missing processing', () => {
    it('should throw error for filter without processing', () => {
      expect(() =>
        filterInstructions({
          specification: 'Test spec',
          vocabulary: mockVocabulary,
        })
      ).toThrow('Filter processing criteria must be provided');
    });

    it('should throw error for find without processing', () => {
      expect(() =>
        findInstructions({
          specification: 'Test spec',
          vocabulary: mockVocabulary,
        })
      ).toThrow('Find selection criteria must be provided');
    });
  });

  describe('createTagExtractor', () => {
    it('should create reusable extractor with properties', async () => {
      const spec = 'Pre-generated spec';
      const extractor = createTagExtractor(spec, mockVocabulary);

      expect(typeof extractor).toBe('function');
      expect(extractor.specification).toBe(spec);
      expect(extractor.vocabulary).toBe(mockVocabulary);

      // llm auto-unwraps {items: [...]} to just the array
      llm.mockResolvedValueOnce(['urgent']);
      const result = await extractor('Test item');
      expect(result).toEqual(['urgent']);
    });
  });

  describe('createTagger', () => {
    it('should create vocabulary-bound tagger', async () => {
      const tagger = createTagger(mockVocabulary);

      expect(typeof tagger).toBe('function');
      expect(tagger.vocabulary).toBe(mockVocabulary);

      // Test single item
      llm.mockResolvedValueOnce('spec').mockResolvedValueOnce(['personal']); // auto-unwrapped

      const result = await tagger('Single item', 'Tag this');
      expect(result).toEqual(['personal']);
    });

    it('should handle arrays with vocabulary-bound tagger', async () => {
      const tagger = createTagger(mockVocabulary);

      llm.mockResolvedValueOnce('spec');
      map.mockResolvedValueOnce([['urgent'], ['financial']]);

      const result = await tagger(['Item 1', 'Item 2'], 'Tag these');
      expect(result).toEqual([['urgent'], ['financial']]);
    });

    it('should expose mapWithVocabulary for tag-vocabulary chain', async () => {
      const tagger = createTagger(mockVocabulary);

      llm.mockResolvedValueOnce('spec');
      map.mockResolvedValueOnce([['urgent']]);

      const result = await tagger.mapWithVocabulary(['Item 1']);
      expect(result).toEqual([['urgent']]);
    });
  });

  describe('default export', () => {
    it('should create stateless tagger requiring vocabulary', async () => {
      const tagger = tags('Tag by urgency');

      expect(typeof tagger).toBe('function');
      expect(tagger.instructions).toBe('Tag by urgency');

      // Should throw without vocabulary
      await expect(tagger('Item')).rejects.toThrow('Vocabulary must be provided');

      // Should work with vocabulary
      llm.mockResolvedValueOnce('spec').mockResolvedValueOnce(['urgent']); // auto-unwrapped

      const result = await tagger('Item', mockVocabulary);
      expect(result).toEqual(['urgent']);
    });

    it('should handle arrays in stateless mode', async () => {
      const tagger = tags('Tag items');

      llm.mockResolvedValueOnce('spec');
      map.mockResolvedValueOnce([['urgent'], []]);

      const result = await tagger(['Item 1', 'Item 2'], mockVocabulary);
      expect(result).toEqual([['urgent'], []]);
    });
  });
});
