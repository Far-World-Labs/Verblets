import { describe } from 'vitest';
import { embed, embedBatch, embedChunked, embedWarmup } from './index.js';
import { cosineSimilarity, vectorSearch } from '../../lib/pure/index.js';
import { extendedTestTimeout } from '../../constants/common.js';
import { isEmbedEnabled } from './state.js';

import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect } = getTestHelpers('Embed verblet');

const skip = !isEmbedEnabled();

describe.skipIf(skip)('Embed verblet', () => {
  it(
    'produces a 384-dimensional Float32Array',
    async () => {
      const vector = await embed('The quick brown fox jumps over the lazy dog');

      expect(vector).toBeInstanceOf(Float32Array);
      expect(vector.length).toBeGreaterThanOrEqual(384);

      // Normalized vectors should have unit magnitude (±tolerance for floating point)
      const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
      expect(magnitude).toBeCloseTo(1.0, 1);
    },
    extendedTestTimeout
  );

  it(
    'captures semantic similarity — related sentences score higher than unrelated ones',
    async () => {
      const [cat, kitten, stock] = await embedBatch([
        'The cat sat on the mat',
        'A kitten rested on the rug',
        'Stock prices surged in afternoon trading',
      ]);

      const similarScore = cosineSimilarity(cat, kitten);
      const dissimilarScore = cosineSimilarity(cat, stock);

      // Related texts should be noticeably more similar
      expect(similarScore).toBeGreaterThan(dissimilarScore);
      expect(similarScore - dissimilarScore).toBeGreaterThan(0.1);
    },
    extendedTestTimeout
  );

  it(
    'retrieves the most relevant document by cosine similarity',
    async () => {
      const documents = [
        'Python is a programming language used for web development and data science',
        'The Eiffel Tower is a wrought-iron lattice tower in Paris, France',
        'Photosynthesis converts sunlight into chemical energy in plants',
        'JavaScript runs in the browser and on the server with Node.js',
      ];

      const query = 'What language can I use to build a website?';

      const [queryVec, ...docVecs] = await embedBatch([query, ...documents]);

      const scores = docVecs.map((vec, i) => ({
        index: i,
        document: documents[i],
        score: cosineSimilarity(queryVec, vec),
      }));
      const sorted = scores.toSorted((a, b) => b.score - a.score);

      // The two programming-related documents should rank in the top 2
      const topTwoIndices = sorted.slice(0, 2).map((s) => s.index);
      expect(topTwoIndices).toContain(0); // Python
      expect(topTwoIndices).toContain(3); // JavaScript
    },
    extendedTestTimeout
  );

  it(
    'warmup pre-downloads the model so embed runs without network',
    async () => {
      // Warmup ensures the model is cached locally
      await embedWarmup();

      const before = Date.now();
      await embed('Timing test after warmup');
      const elapsed = Date.now() - before;

      // After warmup, inference should be fast (model already loaded)
      // This is a sanity check, not a strict perf benchmark
      expect(elapsed).toBeLessThan(5000);
    },
    extendedTestTimeout
  );

  it(
    'embedChunked splits long markdown and embeds each chunk with positions',
    async () => {
      const markdown = [
        '# Introduction',
        '',
        'This document covers the basics of machine learning.',
        'Machine learning is a subset of artificial intelligence.',
        '',
        '# Methods',
        '',
        'Supervised learning uses labeled data for training models.',
        'Unsupervised learning finds hidden patterns without labels.',
      ].join('\n');

      const chunks = await embedChunked(markdown, { maxTokens: 30 });

      expect(chunks.length).toBeGreaterThanOrEqual(2);

      for (const chunk of chunks) {
        expect(chunk.vector).toBeInstanceOf(Float32Array);
        expect(chunk.vector).toHaveLength(384);
        expect(chunk.start).toBeGreaterThanOrEqual(0);
        expect(chunk.end).toBeLessThanOrEqual(markdown.length);
        // Positions map back to original text
        expect(markdown.slice(chunk.start, chunk.end)).toContain(chunk.text.trim());
      }
    },
    extendedTestTimeout
  );

  it(
    'search ranks a small corpus by semantic relevance',
    async () => {
      const documents = [
        { id: 1, text: 'Python is great for data science and machine learning' },
        { id: 2, text: 'The Eiffel Tower stands 330 metres tall in Paris' },
        { id: 3, text: 'Neural networks learn hierarchical representations of data' },
      ];

      const query = 'How do AI models learn from data?';

      const [queryVec, ...docVecs] = await embedBatch([query, ...documents.map((d) => d.text)]);

      const corpus = documents.map((doc, i) => ({ ...doc, vector: docVecs[i] }));
      const results = vectorSearch(queryVec, corpus, { topK: 2 });

      expect(results).toHaveLength(2);
      // AI/ML documents should rank above the Eiffel Tower
      const topIds = results.map((r) => r.id);
      expect(topIds).not.toContain(2);
    },
    extendedTestTimeout
  );
});
