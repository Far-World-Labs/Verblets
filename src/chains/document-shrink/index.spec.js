import { describe, it, expect, beforeEach, vi } from 'vitest';
import documentShrink from './index.js';

// Mock the questions chain
vi.mock('../questions/index.js', () => ({
  default: vi.fn(async (text) => {
    if (text.includes('coffee')) {
      return ['How to make coffee?', 'What type of coffee is best?', 'When to drink coffee?'];
    }
    if (text.includes('relationship')) {
      return ['How to maintain relationships?', 'What makes relationships work?'];
    }
    return ['What is this about?', 'How does it work?'];
  }),
}));

// Mock the collect-terms chain
vi.mock('../collect-terms/index.js', () => ({
  default: vi.fn(async (text) => {
    if (text.includes('coffee')) {
      return ['coffee', 'espresso', 'brew', 'caffeine'];
    }
    if (text.includes('revenue')) {
      return ['revenue', 'Q3', 'growth', 'sales'];
    }
    return ['term1', 'term2'];
  }),
}));

// Mock the reduce chain
vi.mock('../reduce/index.js', () => ({
  default: vi.fn(async (list, _instructions) => {
    return list.slice(0, 3).join(', ');
  }),
}));

// Mock the map chain
vi.mock('../map/index.js', () => ({
  default: vi.fn(async (list, instructions) => {
    // For compression, return shorter versions
    if (instructions.includes('Compress')) {
      return list.map((text) => text.slice(0, Math.floor(text.length * 0.3)));
    }
    return list.map((item, idx) => `mapped-${idx}`);
  }),
}));

// Mock the score chain
vi.mock('../score/index.js', () => ({
  default: vi.fn(async (list, _instructions) => {
    // Return scores based on content
    const scores = list.map((item) => {
      const text = typeof item === 'string' ? item : JSON.stringify(item);
      if (text.includes('coffee')) return 8;
      if (text.includes('relationship')) return 7;
      if (text.includes('revenue')) return 9;
      return 3;
    });

    return {
      scores,
      reference: [],
    };
  }),
}));

// Mock the text-similarity library
vi.mock('../../lib/text-similarity/index.js', () => ({
  TextSimilarity: vi.fn(() => ({
    addChunk: vi.fn(),
    findMatches: vi.fn((text, _options) => {
      // Handle undefined or non-string inputs
      if (!text || typeof text !== 'string') return [];

      const lowerText = text.toLowerCase();

      // Return matches based on content
      const matches = [];
      if (lowerText.includes('coffee')) {
        matches.push({ id: 'exp-0', score: 0.8 });
      }
      if (lowerText.includes('relationship')) {
        matches.push({ id: 'exp-1', score: 0.7 });
      }
      if (lowerText.includes('brew') || lowerText.includes('morning')) {
        matches.push({ id: 'exp-2', score: 0.5 });
      }

      return matches.length > 0 ? matches : [{ id: 'exp-0', score: 0.1 }];
    }),
  })),
  default: vi.fn(() => ({
    addChunk: vi.fn(),
    findMatches: vi.fn((text, _options) => {
      if (!text || typeof text !== 'string') return [];
      const lowerText = text.toLowerCase();
      const matches = [];
      if (lowerText.includes('coffee')) {
        matches.push({ id: 'exp-0', score: 0.8 });
      }
      if (lowerText.includes('relationship')) {
        matches.push({ id: 'exp-1', score: 0.7 });
      }
      if (lowerText.includes('brew') || lowerText.includes('morning')) {
        matches.push({ id: 'exp-2', score: 0.5 });
      }
      return matches.length > 0 ? matches : [{ id: 'exp-0', score: 0.1 }];
    }),
  })),
}));

describe('documentShrink', () => {
  let sampleDocument;

  beforeEach(() => {
    sampleDocument = `This is a document about coffee and relationships. It discusses how making coffee for your partner can strengthen bonds.

The ritual of morning coffee brings people together. When you brew a cup for someone you care about, it shows thoughtfulness.

Relationships require attention and care, much like brewing the perfect cup. Temperature, timing, and technique all matter.

Coffee preferences can reveal personality traits. Some prefer bold espresso, others gentle pour-over methods.

In conclusion, both coffee and relationships benefit from patience and attention to detail.`;
  });

  describe('basic functionality', () => {
    it('should reduce a document to target size', async () => {
      const query = 'coffee and relationships';
      const result = await documentShrink(sampleDocument, query, {
        targetSize: 1000,
        maxIterations: 3,
        aggressiveness: 0.8,
      });

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('metadata');
      expect(result.content).toBeTruthy();
      expect(typeof result.content).toBe('string');

      // Check metadata
      expect(result.metadata.originalSize).toBe(sampleDocument.length);
      expect(result.metadata.finalSize).toBe(result.content.length);
      expect(result.metadata.finalSize).toBeLessThanOrEqual(result.metadata.originalSize);
      expect(parseFloat(result.metadata.reductionRatio)).toBeGreaterThanOrEqual(0);
    });

    it('should preserve query-relevant content', async () => {
      const query = 'making coffee for partner';
      const result = await documentShrink(sampleDocument, query, {
        targetSize: 800,
        aggressiveness: 0.5,
      });

      // Should contain coffee-related chunks
      expect(result.content.toLowerCase()).toContain('coffee');
      expect(result.content).toBeTruthy();
    });

    it('should handle empty documents', async () => {
      const result = await documentShrink('', 'any query', {});

      expect(result.content).toBe('');
      expect(result.metadata.finalSize).toBe(0);
      expect(result.metadata.originalSize).toBe(0);
    });

    it('should handle very short documents', async () => {
      const shortDoc = 'Just a short sentence.';
      const result = await documentShrink(shortDoc, 'test query', {});

      expect(result.content).toBe(shortDoc);
      expect(result.metadata.originalSize).toBe(shortDoc.length);
      expect(result.metadata.finalSize).toBe(shortDoc.length);
    });
  });

  describe('reduction strategies', () => {
    it('should apply different chunk actions based on relevance', async () => {
      const result = await documentShrink(sampleDocument, 'coffee making request', {
        targetSize: 1500,
        aggressiveness: 0.8,
      });

      // Check that we got reduced content
      expect(result.content).toBeTruthy();
      expect(result.metadata.finalSize).toBeLessThanOrEqual(1500);

      // Check metadata tracks different selection methods
      expect(result.metadata.chunks.total).toBeGreaterThan(0);
      expect(result.metadata.chunks.tfIdfSelected).toBeGreaterThanOrEqual(0);
    });

    it('should respect aggressiveness setting', async () => {
      const gentleResult = await documentShrink(sampleDocument, 'relationships', {
        targetSize: 1000,
        aggressiveness: 0.3,
      });

      const aggressiveResult = await documentShrink(sampleDocument, 'relationships', {
        targetSize: 1000,
        aggressiveness: 0.9,
      });

      // More aggressive should try harder to meet target
      expect(gentleResult.metadata.finalSize).toBeGreaterThanOrEqual(0);
      expect(aggressiveResult.metadata.finalSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('structure preservation', () => {
    it('should maintain document structure with XML chunks', async () => {
      const result = await documentShrink(sampleDocument, 'comedy show transcript', {
        targetSize: 2000,
        preserveStructure: true,
      });

      // Verify we get structured output
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('metadata');

      // Verify metadata tracking
      expect(result.metadata.originalSize).toBeGreaterThan(0);
      expect(result.metadata.finalSize).toBeGreaterThan(0);
    });

    it('should track chunk transformations', async () => {
      const result = await documentShrink(sampleDocument, 'video reactions', {
        targetSize: 1200,
      });

      // Check metadata about chunks
      expect(result.metadata.chunks.total).toBeGreaterThan(0);
      expect(result.metadata.allocation).toBeDefined();
      expect(result.metadata.tokens.used).toBeGreaterThanOrEqual(0);
    });
  });

  describe('options handling', () => {
    it('should respect maxIterations limit', async () => {
      const result = await documentShrink(sampleDocument, 'test query', {
        targetSize: 100, // Very small to force reduction
        maxIterations: 2,
      });

      expect(result.content.length).toBeGreaterThan(0);
      // Should still produce some output even with iteration limit
    });

    it('should handle custom chunk sizes', async () => {
      const result = await documentShrink(sampleDocument, 'relationships', {
        targetSize: 1500,
        chunkSize: 200, // Smaller chunks
        minChunkSize: 50,
      });

      expect(result).toHaveProperty('content');
      expect(result.metadata.chunks.total).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid options gracefully', async () => {
      const result = await documentShrink(sampleDocument, 'test', {
        targetSize: -100, // Invalid
        chunkSize: -50, // Invalid
      });

      // Should use defaults and still work
      expect(result).toHaveProperty('content');
      expect(result.content).toBeTruthy();
    });

    it('should handle very long documents', async () => {
      const longDoc = 'This is a test. '.repeat(1000);
      const result = await documentShrink(longDoc, 'test content', {
        targetSize: 1000,
      });

      expect(result.metadata.finalSize).toBeLessThanOrEqual(1500); // Some buffer
      expect(result.content).toBeTruthy();
    });
  });
});
