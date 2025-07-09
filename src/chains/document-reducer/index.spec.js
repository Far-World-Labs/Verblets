import { describe, it, expect, beforeEach, vi } from 'vitest';
import documentReducer from './index.js';
import fs from 'fs/promises';
import path from 'path';

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
  default: vi.fn(async (list, _instructions, _config) => {
    // Return scores based on content
    const scores = list.map((text) => {
      if (text.includes('coffee') || text.includes('relationship')) return 8;
      if (text.includes('video') || text.includes('boy')) return 2;
      return 5;
    });
    return { scores, reference: [] };
  }),
}));

// Mock the chatGPT module - no longer needed for analysis
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async () => {
    return {};
  }),
}));

describe('documentReducer', () => {
  let sampleDocument;

  beforeEach(async () => {
    // Load sample document
    const samplePath = path.join(process.cwd(), 'src/samples/txt/taylor-tomlinson-10-2024.txt');
    sampleDocument = await fs.readFile(samplePath, 'utf-8');
  });

  describe('basic functionality', () => {
    it('should reduce a document to target size', async () => {
      const query = 'coffee and relationships';
      const result = await documentReducer(sampleDocument, query, {
        targetSize: 1000,
        maxIterations: 3,
        aggressiveness: 0.8, // More aggressive reduction
      });

      expect(result).toContain('<document-summary>');
      expect(result).toContain('<metadata>');
      expect(result).toContain('<content>');
      expect(result).toContain('</document-summary>');

      // Extract metadata
      const originalSizeMatch = result.match(/<original-size>(\d+)<\/original-size>/);
      const finalSizeMatch = result.match(/<final-size>(\d+)<\/final-size>/);
      const reductionRatioMatch = result.match(/<reduction-ratio>([\d.]+)<\/reduction-ratio>/);

      expect(originalSizeMatch).toBeTruthy();
      expect(finalSizeMatch).toBeTruthy();
      expect(reductionRatioMatch).toBeTruthy();

      const originalSize = parseInt(originalSizeMatch[1]);
      const finalSize = parseInt(finalSizeMatch[1]);
      const reductionRatio = parseFloat(reductionRatioMatch[1]);

      // Should have some reduction
      expect(finalSize).toBeLessThanOrEqual(originalSize);
      expect(reductionRatio).toBeGreaterThanOrEqual(0); // At least no increase
    });

    it('should preserve query-relevant content', async () => {
      const query = 'making coffee for partner';
      const result = await documentReducer(sampleDocument, query, {
        targetSize: 800,
        aggressiveness: 0.5,
      });

      // Should contain coffee-related chunks
      expect(result.toLowerCase()).toContain('coffee');
      expect(result).toContain('chunk');
    });

    it('should handle empty documents', async () => {
      const result = await documentReducer('', 'any query', {});

      expect(result).toContain('<document-summary>');
      expect(result).toContain('<final-size>0</final-size>');
    });

    it('should handle very short documents', async () => {
      const shortDoc = 'This is a very short document.';
      const result = await documentReducer(shortDoc, 'short', {
        targetSize: 100,
      });

      expect(result).toContain('<document-summary>');
      expect(result).toContain(shortDoc);
    });
  });

  describe('reduction strategies', () => {
    it('should apply different chunk actions based on relevance', async () => {
      const result = await documentReducer(sampleDocument, 'coffee making request', {
        targetSize: 1500,
        aggressiveness: 0.8,
      });

      // Check for different action types in output
      expect(result).toMatch(/action="(keep|compress|remove)"/);

      // Verify metadata tracking
      expect(result).toMatch(/<chunks-removed>\d+<\/chunks-removed>/);
      expect(result).toMatch(/<chunks-compressed>\d+<\/chunks-compressed>/);
    });

    it('should respect aggressiveness setting', async () => {
      const gentleResult = await documentReducer(sampleDocument, 'relationships', {
        targetSize: 1000,
        aggressiveness: 0.3,
      });

      const aggressiveResult = await documentReducer(sampleDocument, 'relationships', {
        targetSize: 1000,
        aggressiveness: 0.9,
      });

      // Extract sizes
      const gentleSize = parseInt(gentleResult.match(/<final-size>(\d+)<\/final-size>/)[1]);
      const aggressiveSize = parseInt(aggressiveResult.match(/<final-size>(\d+)<\/final-size>/)[1]);

      // More aggressive should result in smaller size
      expect(aggressiveSize).toBeLessThanOrEqual(gentleSize);
    });
  });

  describe('structure preservation', () => {
    it('should maintain document structure with XML chunks', async () => {
      const result = await documentReducer(sampleDocument, 'comedy show transcript', {
        targetSize: 2000,
        preserveStructure: true,
      });

      // Verify XML structure
      expect(result).toContain('<document-summary>');
      expect(result).toContain('<content>');

      // Look for chunk tags - both opening and self-closing
      const hasChunks = result.includes('<chunk') && result.includes('id="chunk-');
      expect(hasChunks).toBe(true);

      // Verify metadata section
      expect(result).toMatch(/<original-size>\d+<\/original-size>/);
      expect(result).toMatch(/<final-size>\d+<\/final-size>/);
    });

    it('should track chunk transformations', async () => {
      const result = await documentReducer(sampleDocument, 'video reactions', {
        targetSize: 1200,
      });

      // Check for transformation descriptions
      expect(result).toMatch(/description="[^"]+"/);

      // Should include size information for compressed chunks
      if (result.includes('action="compress"')) {
        expect(result).toMatch(/compressed from \d+ to \d+ chars/);
      }
    });
  });

  describe('options handling', () => {
    it('should respect maxIterations limit', async () => {
      const result = await documentReducer(sampleDocument, 'test query', {
        targetSize: 100, // Very small to force many iterations
        maxIterations: 2,
      });

      const iterationsMatch = result.match(/<iterations>(\d+)<\/iterations>/);
      expect(iterationsMatch).toBeTruthy();
      const iterations = parseInt(iterationsMatch[1]);
      expect(iterations).toBeLessThanOrEqual(2);
    });

    it('should handle custom chunk sizes', async () => {
      const result = await documentReducer(sampleDocument, 'relationships', {
        targetSize: 1500,
        chunkSize: 200, // Smaller chunks
        minChunkSize: 50,
      });

      expect(result).toContain('<document-summary>');

      // With smaller chunks, should have more chunks processed
      const chunkCount = (result.match(/<chunk/g) || []).length;
      expect(chunkCount).toBeGreaterThanOrEqual(3); // At least 3 chunks
    });
  });

  describe('error handling', () => {
    it('should handle invalid options gracefully', async () => {
      const result = await documentReducer(sampleDocument, 'test', {
        targetSize: -100, // Invalid
        aggressiveness: 2, // Out of range
      });

      // Should still produce valid output with defaults
      expect(result).toContain('<document-summary>');
    });

    it('should handle very long documents', async () => {
      // Create a long document by repeating content
      const longDoc = Array(10).fill(sampleDocument).join('\n\n');

      const result = await documentReducer(longDoc, 'coffee', {
        targetSize: 3000,
        maxIterations: 5,
      });

      expect(result).toContain('<document-summary>');

      // Should respect memory limits
      const finalSize = parseInt(result.match(/<final-size>(\d+)<\/final-size>/)[1]);
      expect(finalSize).toBeLessThanOrEqual(longDoc.length); // Should not exceed original
    }, 10000); // 10 second timeout
  });
});
