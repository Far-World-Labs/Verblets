import { describe, it, expect, beforeEach } from 'vitest';
import TextSimilarity from './index.js';

describe('TextSimilarity', () => {
  let textSim;

  beforeEach(() => {
    textSim = new TextSimilarity();
  });

  describe('addChunk', () => {
    it('should add a chunk with auto-generated ID', () => {
      const text = 'Machine learning is a subset of artificial intelligence';
      const id = textSim.addChunk(text);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      const chunk = textSim.getChunk(id);
      expect(chunk).toEqual({
        id,
        text,
      });
    });

    it('should add a chunk with custom ID', () => {
      const text = 'Deep learning uses neural networks';
      const customId = 'custom-id-123';
      const id = textSim.addChunk(text, customId);

      expect(id).toBe(customId);

      const chunk = textSim.getChunk(customId);
      expect(chunk).toEqual({
        id: customId,
        text,
      });
    });

    it('should throw error when adding chunk with duplicate ID', () => {
      const text1 = 'First chunk';
      const text2 = 'Second chunk';
      const id = 'duplicate-id';

      textSim.addChunk(text1, id);

      expect(() => {
        textSim.addChunk(text2, id);
      }).toThrow("Chunk with id 'duplicate-id' already exists");
    });

    it('should handle multiple chunks', () => {
      const texts = [
        'Machine learning is artificial intelligence',
        'Deep learning uses neural networks',
        'Natural language processing handles text',
      ];

      const ids = texts.map((text) => textSim.addChunk(text));

      expect(ids).toHaveLength(3);
      expect(textSim.getStats().totalChunks).toBe(3);
    });
  });

  describe('deleteChunk', () => {
    it('should delete an existing chunk', () => {
      const text = 'Machine learning is artificial intelligence';
      const id = textSim.addChunk(text);

      expect(textSim.getChunk(id)).toBeDefined();

      const result = textSim.deleteChunk(id);
      expect(result).toBe(true);
      expect(textSim.getChunk(id)).toBeNull();
      expect(textSim.getStats().totalChunks).toBe(0);
    });

    it('should throw error when deleting non-existent chunk', () => {
      expect(() => {
        textSim.deleteChunk('non-existent-id');
      }).toThrow("Chunk with id 'non-existent-id' not found");
    });

    it('should handle deletion from multiple chunks', () => {
      const id1 = textSim.addChunk('First chunk');
      const id2 = textSim.addChunk('Second chunk');
      const id3 = textSim.addChunk('Third chunk');

      expect(textSim.getStats().totalChunks).toBe(3);

      textSim.deleteChunk(id2);

      expect(textSim.getStats().totalChunks).toBe(2);
      expect(textSim.getChunk(id1)).toBeDefined();
      expect(textSim.getChunk(id2)).toBeNull();
      expect(textSim.getChunk(id3)).toBeDefined();
    });
  });

  describe('findNearest', () => {
    beforeEach(() => {
      textSim.addChunk('Machine learning is a subset of artificial intelligence', 'ml');
      textSim.addChunk('Deep learning uses neural networks for pattern recognition', 'dl');
      textSim.addChunk('Natural language processing handles text analysis', 'nlp');
      textSim.addChunk('Computer vision processes images and videos', 'cv');
      textSim.addChunk('Reinforcement learning trains agents through rewards', 'rl');
    });

    it('should find nearest chunks with default options', () => {
      const results = textSim.findNearest('artificial intelligence machine learning');

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('text');
      expect(results[0]).toHaveProperty('score');
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should respect limit parameter', () => {
      const results = textSim.findNearest('machine learning', { limit: 2 });

      expect(results).toHaveLength(2);
    });

    it('should respect threshold parameter', () => {
      const results = textSim.findNearest('machine learning', { threshold: 0.5 });

      results.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should return results without scores when includeScores is false', () => {
      const results = textSim.findNearest('machine learning', { includeScores: false });

      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('text');
      expect(results[0]).not.toHaveProperty('score');
    });

    it('should return empty array when no chunks exist', () => {
      const emptyTextSim = new TextSimilarity();
      const results = emptyTextSim.findNearest('test query');

      expect(results).toEqual([]);
    });

    it('should return results sorted by similarity score', () => {
      const results = textSim.findNearest('machine learning artificial intelligence');

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });
  });

  describe('findMatches', () => {
    beforeEach(() => {
      textSim.addChunk('Machine learning is artificial intelligence', 'ml');
      textSim.addChunk('Deep learning uses neural networks', 'dl');
      textSim.addChunk('Natural language processing handles text', 'nlp');
    });

    it('should find matches above threshold', () => {
      const results = textSim.findMatches('machine learning', { threshold: 0.1 });

      expect(results).toBeInstanceOf(Array);
      results.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0.1);
      });
    });

    it('should use default threshold when not specified', () => {
      const results = textSim.findMatches('machine learning');

      expect(results).toBeInstanceOf(Array);
      results.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0.1);
      });
    });

    it('should return empty array when no matches above threshold', () => {
      const results = textSim.findMatches('completely unrelated query', { threshold: 0.9 });

      expect(results).toEqual([]);
    });
  });

  describe('clusterChunks', () => {
    beforeEach(() => {
      textSim.addChunk('Machine learning is artificial intelligence', 'ml1');
      textSim.addChunk('Deep learning is machine learning', 'ml2');
      textSim.addChunk('Natural language processing handles text', 'nlp1');
      textSim.addChunk('Text processing and language analysis', 'nlp2');
      textSim.addChunk('Computer vision processes images', 'cv');
    });

    it('should cluster chunks with default options', () => {
      const clusters = textSim.clusterChunks();

      expect(clusters).toBeInstanceOf(Array);
      expect(clusters.length).toBeGreaterThan(0);

      clusters.forEach((cluster) => {
        expect(cluster).toHaveProperty('id');
        expect(cluster).toHaveProperty('chunks');
        expect(cluster).toHaveProperty('size');
        expect(cluster.chunks).toBeInstanceOf(Array);
        expect(cluster.size).toBe(cluster.chunks.length);
      });
    });

    it('should respect numClusters parameter', () => {
      const clusters = textSim.clusterChunks({ numClusters: 2 });

      expect(clusters.length).toBeLessThanOrEqual(2);
    });

    it('should respect threshold parameter', () => {
      const clusters = textSim.clusterChunks({ threshold: 0.9 });

      clusters.forEach((cluster) => {
        expect(cluster.size).toBeGreaterThan(0);
      });
    });

    it('should return empty array when no chunks exist', () => {
      const emptyTextSim = new TextSimilarity();
      const clusters = emptyTextSim.clusterChunks();

      expect(clusters).toEqual([]);
    });

    it('should include chunk details in clusters', () => {
      const clusters = textSim.clusterChunks();

      clusters.forEach((cluster) => {
        cluster.chunks.forEach((chunk) => {
          expect(chunk).toHaveProperty('id');
          expect(chunk).toHaveProperty('text');
          expect(typeof chunk.id).toBe('string');
          expect(typeof chunk.text).toBe('string');
        });
      });
    });
  });

  describe('getChunk', () => {
    it('should return chunk by ID', () => {
      const text = 'Machine learning is artificial intelligence';
      const id = textSim.addChunk(text);

      const chunk = textSim.getChunk(id);

      expect(chunk).toEqual({
        id,
        text,
      });
    });

    it('should return null for non-existent chunk', () => {
      const chunk = textSim.getChunk('non-existent-id');

      expect(chunk).toBeNull();
    });
  });

  describe('getAllChunks', () => {
    it('should return all chunks', () => {
      const texts = ['First chunk', 'Second chunk', 'Third chunk'];
      const ids = texts.map((text) => textSim.addChunk(text));

      const chunks = textSim.getAllChunks();

      expect(chunks).toHaveLength(3);
      chunks.forEach((chunk, index) => {
        expect(chunk).toEqual({
          id: ids[index],
          text: texts[index],
        });
      });
    });

    it('should return empty array when no chunks exist', () => {
      const chunks = textSim.getAllChunks();

      expect(chunks).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      textSim.addChunk('Machine learning is artificial intelligence');
      textSim.addChunk('Deep learning uses neural networks');

      const stats = textSim.getStats();

      expect(stats).toHaveProperty('totalChunks');
      expect(stats).toHaveProperty('vocabularySize');
      expect(stats.totalChunks).toBe(2);
      expect(stats.vocabularySize).toBeGreaterThan(0);
    });

    it('should return zero statistics for empty corpus', () => {
      const stats = textSim.getStats();

      expect(stats.totalChunks).toBe(0);
      expect(stats.vocabularySize).toBe(0);
    });
  });

  describe('integration tests', () => {
    it('should handle complete workflow', () => {
      const texts = [
        'Machine learning algorithms learn from data',
        'Deep learning networks have multiple layers',
        'Natural language processing analyzes text',
        'Computer vision interprets images',
        'Reinforcement learning uses rewards and penalties',
      ];

      const ids = texts.map((text) => textSim.addChunk(text));

      expect(textSim.getStats().totalChunks).toBe(5);

      const nearest = textSim.findNearest('machine learning data');
      expect(nearest.length).toBeGreaterThan(0);
      expect(nearest[0].score).toBeGreaterThan(0);

      const matches = textSim.findMatches('learning', { threshold: 0.05 });
      expect(matches.length).toBeGreaterThan(0);

      const clusters = textSim.clusterChunks({ numClusters: 3 });
      expect(clusters.length).toBeGreaterThan(0);

      textSim.deleteChunk(ids[0]);
      expect(textSim.getStats().totalChunks).toBe(4);

      const allChunks = textSim.getAllChunks();
      expect(allChunks.length).toBe(4);
    });

    it('should handle similarity calculations correctly', () => {
      const id1 = textSim.addChunk('The quick brown fox jumps over the lazy dog');
      const id2 = textSim.addChunk('A quick brown fox leaps over a lazy dog');
      const id3 = textSim.addChunk('Artificial intelligence and machine learning');

      const results = textSim.findNearest('quick brown fox');

      expect(results).toHaveLength(3);
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
      expect(results[1].score).toBeGreaterThanOrEqual(results[2].score);

      const topResult = results.find((r) => r.id === id1 || r.id === id2);
      const bottomResult = results.find((r) => r.id === id3);

      expect(topResult.score).toBeGreaterThan(bottomResult.score);
    });
  });
});
