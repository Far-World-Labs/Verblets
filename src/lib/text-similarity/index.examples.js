import { describe, expect as vitestExpect, it as vitestIt, afterAll } from 'vitest';
import TextSimilarity from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { logSuiteEnd } from '../../chains/test-analysis/setup.js';
import { wrapIt, wrapExpect } from '../../chains/test-analysis/test-wrappers.js';
import { extractFileContext } from '../logger/index.js';
import { getConfig } from '../../chains/test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Text similarity lib' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Text similarity lib' } })
  : vitestExpect;
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

afterAll(async () => {
  await suiteLogEnd('Text similarity lib', extractFileContext(2));
});

describe('TextSimilarity examples', () => {
  it(
    'should find nearest documents for machine learning query',
    () => {
      const textSim = new TextSimilarity();

      const documents = [
        'Machine learning algorithms learn patterns from large datasets',
        'Deep learning uses neural networks with multiple hidden layers',
        'Natural language processing enables computers to understand text',
        'Computer vision allows machines to interpret visual information',
        'Data science combines statistics with programming for insights',
      ];

      documents.forEach((doc, index) => {
        textSim.addChunk(doc, `doc-${index + 1}`);
      });

      const results = textSim.findNearest('artificial intelligence and machine learning', {
        limit: 2,
        threshold: 0.1,
      });

      expect(results).toHaveLength(2);
      expect(results[0].score).toBeGreaterThan(0.1);
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);

      // The machine learning document should be most relevant
      const topResult = results[0];
      expect(topResult.text).toContain('Machine learning');
    },
    longTestTimeout
  );

  it(
    'should cluster similar technical documents',
    () => {
      const textSim = new TextSimilarity();

      const mlDocs = [
        'Machine learning models require training data for pattern recognition',
        'Deep learning networks use backpropagation for optimization',
      ];

      const nlpDocs = [
        'Natural language processing involves tokenization and parsing',
        'Text analysis includes sentiment analysis and entity recognition',
      ];

      const visionDocs = [
        'Computer vision processes images using convolutional neural networks',
        'Image recognition requires feature extraction and classification',
      ];

      const allDocs = [...mlDocs, ...nlpDocs, ...visionDocs];
      allDocs.forEach((doc, index) => {
        textSim.addChunk(doc, `doc-${index + 1}`);
      });

      const clusters = textSim.clusterChunks({
        numClusters: 3,
        threshold: 0.15,
      });

      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters.length).toBeLessThanOrEqual(3);

      // Each cluster should have at least one document
      clusters.forEach((cluster) => {
        expect(cluster.chunks.length).toBeGreaterThan(0);
        expect(cluster.size).toBe(cluster.chunks.length);
      });
    },
    longTestTimeout
  );

  it(
    'should handle document deletion and maintain corpus integrity',
    () => {
      const textSim = new TextSimilarity();

      const documents = [
        'First document about machine learning concepts',
        'Second document about data science methodologies',
        'Third document about artificial intelligence applications',
      ];

      const ids = documents.map((doc, index) => {
        return textSim.addChunk(doc, `doc-${index + 1}`);
      });

      expect(textSim.getStats().totalChunks).toBe(3);

      // Delete middle document
      textSim.deleteChunk(ids[1]);

      expect(textSim.getStats().totalChunks).toBe(2);
      expect(textSim.getChunk(ids[0])).toBeDefined();
      expect(textSim.getChunk(ids[1])).toBeNull();
      expect(textSim.getChunk(ids[2])).toBeDefined();

      // Search should still work with remaining documents
      const results = textSim.findNearest('machine learning');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.id === ids[0])).toBe(true);
      expect(results.some((r) => r.id === ids[2])).toBe(true);
    },
    longTestTimeout
  );

  it(
    'should find matches above specified threshold',
    () => {
      const textSim = new TextSimilarity();

      const documents = [
        'Python programming language for data analysis',
        'JavaScript development for web applications',
        'Machine learning with Python libraries',
        'Database management and SQL queries',
        'Data visualization using Python matplotlib',
      ];

      documents.forEach((doc, index) => {
        textSim.addChunk(doc, `doc-${index + 1}`);
      });

      const matches = textSim.findMatches('Python programming', {
        threshold: 0.2,
      });

      expect(matches.length).toBeGreaterThan(0);

      // All matches should be above threshold
      matches.forEach((match) => {
        expect(match.score).toBeGreaterThanOrEqual(0.2);
      });

      // Python-related documents should score higher
      const pythonMatches = matches.filter((match) => match.text.toLowerCase().includes('python'));
      expect(pythonMatches.length).toBeGreaterThan(0);
    },
    longTestTimeout
  );

  it(
    'should provide accurate similarity scores for related content',
    () => {
      const textSim = new TextSimilarity();

      const similarDocs = [
        'Machine learning algorithms for pattern recognition',
        'Pattern recognition using machine learning techniques',
      ];

      const differentDoc = 'Cooking recipes for Italian pasta dishes';

      textSim.addChunk(similarDocs[0], 'similar-1');
      textSim.addChunk(similarDocs[1], 'similar-2');
      textSim.addChunk(differentDoc, 'different');

      const results = textSim.findNearest('machine learning pattern recognition');

      expect(results).toHaveLength(3);

      const similar1 = results.find((r) => r.id === 'similar-1');
      const similar2 = results.find((r) => r.id === 'similar-2');
      const different = results.find((r) => r.id === 'different');

      // Similar documents should score higher than different document
      expect(similar1.score).toBeGreaterThan(different.score);
      expect(similar2.score).toBeGreaterThan(different.score);

      // Similar documents should have reasonably high scores
      expect(similar1.score).toBeGreaterThan(0.3);
      expect(similar2.score).toBeGreaterThan(0.3);
    },
    longTestTimeout
  );

  it(
    'should handle empty corpus gracefully',
    () => {
      const textSim = new TextSimilarity();

      const stats = textSim.getStats();
      expect(stats.totalChunks).toBe(0);
      expect(stats.vocabularySize).toBe(0);

      const nearest = textSim.findNearest('any query');
      expect(nearest).toEqual([]);

      const matches = textSim.findMatches('any query');
      expect(matches).toEqual([]);

      const clusters = textSim.clusterChunks();
      expect(clusters).toEqual([]);

      const allChunks = textSim.getAllChunks();
      expect(allChunks).toEqual([]);
    },
    longTestTimeout
  );
});
