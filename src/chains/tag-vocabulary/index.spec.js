import { describe, expect, it, vi, beforeEach } from 'vitest';
import tagVocabulary, {
  generateInitialVocabulary,
  refineVocabulary,
  computeTagStatistics,
} from './index.js';

// Mock the chatGPT module
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(),
}));

import chatGPT from '../../lib/chatgpt/index.js';

describe('tag-vocabulary', () => {
  const mockItems = [
    'Pay credit card bill',
    'Schedule dentist appointment',
    'Quarterly tax filing',
    'Buy groceries',
    'Team meeting at 3pm',
  ];

  const mockVocabulary = {
    tags: [
      { id: 'urgent', label: 'Urgent', description: 'Immediate action needed' },
      { id: 'financial', label: 'Financial', description: 'Money related' },
      { id: 'personal', label: 'Personal', description: 'Personal tasks' },
      { id: 'work', label: 'Work', description: 'Work related' },
      { id: 'health', label: 'Health', description: 'Health related' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('computeTagStatistics', () => {
    it('should compute tag usage statistics', () => {
      const taggedItems = [
        ['urgent', 'financial'],
        ['personal', 'health'],
        ['financial'],
        ['work'],
        ['urgent', 'work'],
      ];

      const stats = computeTagStatistics(mockVocabulary, taggedItems);

      expect(stats.stats.totalItems).toBe(5);
      expect(stats.stats.itemsWithTags).toBe(5);
      expect(stats.stats.coveragePercent).toBe(100);
      expect(stats.stats.avgTagsPerItem).toBeCloseTo(1.6); // 8 total tags / 5 items
      expect(stats.stats.unusedTags).toBe(0);

      expect(stats.mostUsed).toHaveLength(3);
      expect(stats.mostUsed[0].tag.id).toBe('urgent');
      expect(stats.mostUsed[0].count).toBe(2);

      expect(stats.leastUsed).toHaveLength(3);
      expect(stats.problematicItems).toBeDefined();
    });

    it('should identify problematic items', () => {
      const taggedItems = [
        ['urgent', 'financial', 'personal', 'work'], // overtagged
        [], // untagged
        ['financial'],
        ['work'],
        ['urgent'],
      ];

      const stats = computeTagStatistics(mockVocabulary, taggedItems, {
        problematicSampleSize: 2,
      });

      const untagged = stats.problematicItems.filter((p) => p.type === 'untagged');
      const overtagged = stats.problematicItems.filter((p) => p.type === 'overtagged');

      expect(untagged).toHaveLength(1);
      expect(untagged[0].itemIndex).toBe(1);

      expect(overtagged).toHaveLength(1);
      expect(overtagged[0].itemIndex).toBe(0);
      expect(overtagged[0].tagCount).toBe(4);
    });

    it('should handle empty tag arrays', () => {
      const taggedItems = [[], [], []];

      const stats = computeTagStatistics(mockVocabulary, taggedItems);

      expect(stats.stats.itemsWithTags).toBe(0);
      expect(stats.stats.coveragePercent).toBe(0);
      expect(stats.stats.avgTagsPerItem).toBe(0);
      expect(stats.stats.unusedTags).toBe(5);
    });
  });

  describe('generateInitialVocabulary', () => {
    it('should generate vocabulary from text specification', async () => {
      chatGPT.mockResolvedValueOnce(mockVocabulary);

      const spec = 'Create tags for task management with urgency and category facets';
      const result = await generateInitialVocabulary(spec, mockItems.slice(0, 2));

      expect(chatGPT).toHaveBeenCalledWith(
        expect.stringContaining(spec),
        expect.objectContaining({
          modelOptions: expect.objectContaining({
            response_format: expect.objectContaining({
              type: 'json_schema',
            }),
          }),
        })
      );
      expect(result).toEqual(mockVocabulary);
    });

    it('should include sample items in generation', async () => {
      chatGPT.mockResolvedValueOnce(mockVocabulary);

      await generateInitialVocabulary('Task tags', mockItems);

      const call = chatGPT.mock.calls[0][0];
      expect(call).toContain('Pay credit card bill');
      expect(call).toContain('sample-items');
    });
  });

  describe('refineVocabulary', () => {
    it('should refine vocabulary based on usage', async () => {
      const taggedItems = [
        ['urgent', 'financial'],
        ['personal'],
        ['financial'],
        ['work'],
        ['urgent', 'work'],
      ];

      const refinedVocab = {
        ...mockVocabulary,
        tags: [
          ...mockVocabulary.tags.slice(0, 4), // Remove health tag
          { id: 'routine', label: 'Routine', description: 'Regular tasks' },
        ],
      };

      chatGPT.mockResolvedValueOnce(refinedVocab);

      const result = await refineVocabulary(mockVocabulary, taggedItems, 'Task management tags');

      const call = chatGPT.mock.calls[0][0];
      expect(call).toContain('usage-statistics');
      expect(call).toContain('most-used-tags');
      expect(call).toContain('least-used-tags');
      expect(result).toEqual(refinedVocab);
    });

    it('should include problematic items in refinement', async () => {
      const taggedItems = [
        ['urgent', 'financial', 'personal', 'work'], // overtagged
        [], // untagged
        ['financial'],
      ];

      chatGPT.mockResolvedValueOnce(mockVocabulary);

      await refineVocabulary(mockVocabulary, taggedItems, 'Tags');

      const call = chatGPT.mock.calls[0][0];
      expect(call).toContain('problematic-items');
      expect(call).toContain('untagged');
      expect(call).toContain('overtagged');
    });
  });

  describe('tagVocabulary', () => {
    it('should generate and refine vocabulary with tagger', async () => {
      const mockTagger = vi.fn();
      const taggedResults = [['urgent', 'financial'], ['personal'], ['financial']];

      chatGPT
        .mockResolvedValueOnce(mockVocabulary) // generateInitialVocabulary
        .mockResolvedValueOnce(mockVocabulary); // refineVocabulary

      mockTagger.mockResolvedValueOnce(taggedResults);

      const result = await tagVocabulary('Task tags', mockItems, {
        tagger: mockTagger,
        sampleSize: 2,
      });

      expect(chatGPT).toHaveBeenCalledTimes(2);
      expect(mockTagger).toHaveBeenCalledWith(mockItems, mockVocabulary);
      expect(result).toEqual(mockVocabulary);
    });

    it('should throw error without tagger', async () => {
      await expect(tagVocabulary('Task tags', mockItems, {})).rejects.toThrow(
        'A tagger function must be provided'
      );
    });

    it('should respect sample size', async () => {
      const mockTagger = vi.fn(() => Promise.resolve([]));

      chatGPT.mockResolvedValueOnce(mockVocabulary).mockResolvedValueOnce(mockVocabulary);

      const longList = Array(100).fill('item');
      await tagVocabulary('Tags', longList, {
        tagger: mockTagger,
        sampleSize: 10,
      });

      // Check that only 10 sample items were used for initial generation
      const firstCall = chatGPT.mock.calls[0][0];
      // The prompt should contain sample-items tag with an array
      expect(firstCall).toContain('<sample-items>');
      expect(firstCall).toContain('</sample-items>');

      // Extract and parse the sample items
      const sampleMatch = firstCall.match(/<sample-items>([\s\S]*?)<\/sample-items>/);
      expect(sampleMatch).toBeTruthy();

      // The content should be a JSON array of 10 items
      const sampleContent = JSON.parse(sampleMatch[1]);
      expect(sampleContent).toHaveLength(10);
    });
  });

  describe('integration with tags chain', () => {
    it('should work with a mock tags chain', async () => {
      // Simulate a configured tags chain
      const mockTagsChain = vi.fn(async (items, _vocabulary) => {
        // Return tag arrays based on simple logic
        return items.map((item) => {
          const tags = [];
          if (item.includes('urgent') || item.includes('bill')) {
            tags.push('urgent');
          }
          if (item.includes('financial') || item.includes('tax')) {
            tags.push('financial');
          }
          return tags;
        });
      });

      chatGPT.mockResolvedValueOnce(mockVocabulary).mockResolvedValueOnce(mockVocabulary);

      const result = await tagVocabulary(
        'Categorize by urgency and type',
        ['urgent task', 'tax filing', 'other item'],
        { tagger: mockTagsChain }
      );

      expect(mockTagsChain).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
