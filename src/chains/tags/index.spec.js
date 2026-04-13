import { describe, expect, it, vi, beforeEach } from 'vitest';
import tagItem, { tagSpec, mapTags, tagInstructions } from './index.js';

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

  describe('tagItem', () => {
    it('should tag a single item with spec generation', async () => {
      const mockSpec = 'Generated spec';
      const mockTags = ['personal'];

      llm
        .mockResolvedValueOnce(mockSpec) // tagSpec
        .mockResolvedValueOnce(mockTags); // applyTags - auto-unwrapped

      const result = await tagItem('Call mom', {
        text: 'Tag personal items',
        vocabulary: mockVocabulary,
      });

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
      const result = await mapTags(items, {
        text: 'Tag all tasks',
        vocabulary: mockVocabulary,
      });

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

  describe('tagInstructions', () => {
    it('returns instruction bundle with spec and vocabulary', () => {
      const bundle = tagInstructions({ spec: 'Test spec', vocabulary: mockVocabulary });

      expect(bundle.text).toContain('tag specification');
      expect(bundle.spec).toBe('Test spec');
      expect(bundle.vocabulary).toBe(mockVocabulary);
      expect(bundle.vocabularyMode).toBe('strict');
    });

    it('allows vocabulary mode override', () => {
      const bundle = tagInstructions({
        spec: 'Test spec',
        vocabulary: mockVocabulary,
        vocabularyMode: 'open',
      });

      expect(bundle.vocabularyMode).toBe('open');
    });

    it('passes through additional context keys', () => {
      const bundle = tagInstructions({
        spec: 'spec',
        vocabulary: mockVocabulary,
        domain: 'customer support',
      });

      expect(bundle.domain).toBe('customer support');
    });
  });
});
