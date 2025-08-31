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

// Mock the dependencies
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../map/index.js', () => ({
  default: vi.fn(),
}));

import chatGPT from '../../lib/chatgpt/index.js';
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
      chatGPT.mockResolvedValueOnce(mockSpec);

      const spec = await tagSpec('Tag by priority and type');

      expect(chatGPT).toHaveBeenCalledWith(
        expect.stringContaining('Tag by priority and type'),
        expect.objectContaining({
          system: expect.stringContaining('tag specification generator'),
        })
      );
      expect(spec).toBe(mockSpec);
    });
  });

  describe('applyTags', () => {
    it('should apply tags to an item', async () => {
      // chatGPT auto-unwraps {items: [...]} to just the array
      chatGPT.mockResolvedValueOnce(['urgent', 'financial']);

      const item = 'Pay credit card bill today';
      const spec = 'Tag based on urgency and category';

      const result = await applyTags(item, spec, mockVocabulary);

      expect(chatGPT).toHaveBeenCalledWith(
        expect.stringContaining(item),
        expect.objectContaining({
          modelOptions: expect.objectContaining({
            response_format: expect.objectContaining({
              type: 'json_schema',
            }),
          }),
        })
      );
      expect(result).toEqual(['urgent', 'financial']);
    });

    it('should handle empty tag arrays', async () => {
      // chatGPT auto-unwraps {items: [...]} to just the array
      chatGPT.mockResolvedValueOnce([]);

      const result = await applyTags('Random note', 'spec', mockVocabulary);
      expect(result).toEqual([]);
    });
  });

  describe('tagItem', () => {
    it('should tag a single item with spec generation', async () => {
      const mockSpec = 'Generated spec';
      const mockTags = ['personal'];

      chatGPT
        .mockResolvedValueOnce(mockSpec) // tagSpec
        .mockResolvedValueOnce(mockTags); // applyTags - auto-unwrapped

      const result = await tagItem('Call mom', 'Tag personal items', mockVocabulary);

      expect(chatGPT).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockTags);
    });
  });

  describe('mapTags', () => {
    it('should tag multiple items', async () => {
      const mockSpec = 'Generated spec';
      const mockResults = [['urgent'], ['financial', 'personal'], []];

      chatGPT.mockResolvedValueOnce(mockSpec); // tagSpec
      map.mockResolvedValueOnce(mockResults); // map operation

      const items = ['Task 1', 'Task 2', 'Task 3'];
      const result = await mapTags(items, 'Tag all tasks', mockVocabulary);

      expect(chatGPT).toHaveBeenCalledTimes(1);
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

  describe('instruction builders', () => {
    it('should create map instructions', () => {
      const instructions = mapInstructions({
        specification: 'Test spec',
        vocabulary: mockVocabulary,
      });

      expect(instructions).toContain('Test spec');
      expect(instructions).toContain('tag-specification');
      expect(instructions).toContain('available-tags'); // The actual XML tag used
    });

    it('should create filter instructions', () => {
      const instructions = filterInstructions({
        specification: 'Test spec',
        vocabulary: mockVocabulary,
        processing: 'Keep urgent items',
      });

      expect(instructions).toContain('Test spec');
      expect(instructions).toContain('Keep urgent items');
      expect(instructions).toContain('filter-criteria');
    });

    it('should throw error for filter without processing', () => {
      expect(() =>
        filterInstructions({
          specification: 'Test spec',
          vocabulary: mockVocabulary,
        })
      ).toThrow('Filter processing criteria must be provided');
    });

    it('should create reduce instructions', () => {
      const instructions = reduceInstructions({
        specification: 'Test spec',
        vocabulary: mockVocabulary,
        processing: 'Count tags by frequency',
      });

      expect(instructions).toContain('Test spec');
      expect(instructions).toContain('Count tags by frequency');
    });

    it('should create find instructions', () => {
      const instructions = findInstructions({
        specification: 'Test spec',
        vocabulary: mockVocabulary,
        processing: 'Find most urgent',
      });

      expect(instructions).toContain('Test spec');
      expect(instructions).toContain('Find most urgent');
      expect(instructions).toContain('selection-criteria');
    });

    it('should throw error for find without processing', () => {
      expect(() =>
        findInstructions({
          specification: 'Test spec',
          vocabulary: mockVocabulary,
        })
      ).toThrow('Find selection criteria must be provided');
    });

    it('should create group instructions', () => {
      const instructions = groupInstructions({
        specification: 'Test spec',
        vocabulary: mockVocabulary,
        processing: 'Group by category',
      });

      expect(instructions).toContain('Test spec');
      expect(instructions).toContain('Group by category');
      expect(instructions).toContain('grouping-strategy');
    });
  });

  describe('createTagExtractor', () => {
    it('should create reusable extractor with properties', async () => {
      const spec = 'Pre-generated spec';
      const extractor = createTagExtractor(spec, mockVocabulary);

      expect(typeof extractor).toBe('function');
      expect(extractor.specification).toBe(spec);
      expect(extractor.vocabulary).toBe(mockVocabulary);

      // chatGPT auto-unwraps {items: [...]} to just the array
      chatGPT.mockResolvedValueOnce(['urgent']);
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
      chatGPT.mockResolvedValueOnce('spec').mockResolvedValueOnce(['personal']); // auto-unwrapped

      const result = await tagger('Single item', 'Tag this');
      expect(result).toEqual(['personal']);
    });

    it('should handle arrays with vocabulary-bound tagger', async () => {
      const tagger = createTagger(mockVocabulary);

      chatGPT.mockResolvedValueOnce('spec');
      map.mockResolvedValueOnce([['urgent'], ['financial']]);

      const result = await tagger(['Item 1', 'Item 2'], 'Tag these');
      expect(result).toEqual([['urgent'], ['financial']]);
    });

    it('should expose mapWithVocabulary for tag-vocabulary chain', async () => {
      const tagger = createTagger(mockVocabulary);

      chatGPT.mockResolvedValueOnce('spec');
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
      chatGPT.mockResolvedValueOnce('spec').mockResolvedValueOnce(['urgent']); // auto-unwrapped

      const result = await tagger('Item', mockVocabulary);
      expect(result).toEqual(['urgent']);
    });

    it('should handle arrays in stateless mode', async () => {
      const tagger = tags('Tag items');

      chatGPT.mockResolvedValueOnce('spec');
      map.mockResolvedValueOnce([['urgent'], []]);

      const result = await tagger(['Item 1', 'Item 2'], mockVocabulary);
      expect(result).toEqual([['urgent'], []]);
    });
  });
});
