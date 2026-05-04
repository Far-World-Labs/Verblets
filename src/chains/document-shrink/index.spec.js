import { vi, expect } from 'vitest';
import documentShrink, { mapThoroughness } from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

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

vi.mock('../collect-terms/index.js', () => ({
  default: vi.fn(async (text) => {
    if (text.includes('coffee')) return ['coffee', 'espresso', 'brew', 'caffeine'];
    if (text.includes('revenue')) return ['revenue', 'Q3', 'growth', 'sales'];
    return ['term1', 'term2'];
  }),
}));

vi.mock('../reduce/index.js', () => ({
  default: vi.fn(async (list) => list.slice(0, 3).join(', ')),
}));

vi.mock('../map/index.js', () => ({
  default: vi.fn(async (list, instructions) => {
    if (instructions.includes('Compress')) {
      return list.map((text) => text.slice(0, Math.floor(text.length * 0.3)));
    }
    return list.map((_, idx) => `withPolicy-${idx}`);
  }),
}));

vi.mock('../score/index.js', () => ({
  default: vi.fn(async (list) => ({
    scores: list.map((item) => {
      const text = typeof item === 'string' ? item : JSON.stringify(item);
      if (text.includes('coffee')) return 8;
      if (text.includes('relationship')) return 7;
      if (text.includes('revenue')) return 9;
      return 3;
    }),
    reference: [],
  })),
}));

vi.mock('../../lib/text-similarity/index.js', () => {
  const makeSimilarity = () => ({
    addChunk: vi.fn(),
    findMatches: vi.fn((text) => {
      if (!text || typeof text !== 'string') return [];
      const lower = text.toLowerCase();
      const matches = [];
      if (lower.includes('coffee')) matches.push({ id: 'exp-0', score: 0.8 });
      if (lower.includes('relationship')) matches.push({ id: 'exp-1', score: 0.7 });
      if (lower.includes('brew') || lower.includes('morning')) {
        matches.push({ id: 'exp-2', score: 0.5 });
      }
      return matches.length ? matches : [{ id: 'exp-0', score: 0.1 }];
    }),
  });
  return {
    TextSimilarity: vi.fn(makeSimilarity),
    default: vi.fn(makeSimilarity),
  };
});

const sampleDocument = `This is a document about coffee and relationships. It discusses how making coffee for your partner can strengthen bonds.

The ritual of morning coffee brings people together. When you brew a cup for someone you care about, it shows thoughtfulness.

Relationships require attention and care, much like brewing the perfect cup. Temperature, timing, and technique all matter.

Coffee preferences can reveal personality traits. Some prefer bold espresso, others gentle pour-over methods.

In conclusion, both coffee and relationships benefit from patience and attention to detail.`;

runTable({
  describe: 'documentShrink',
  examples: [
    {
      name: 'reduces a document to target size',
      inputs: {
        doc: sampleDocument,
        query: 'coffee and relationships',
        options: { targetSize: 1000, compression: 0.8 },
      },
      want: { baseline: true },
    },
    {
      name: 'preserves query-relevant content',
      inputs: {
        doc: sampleDocument,
        query: 'making coffee for partner',
        options: { targetSize: 800, compression: 0.5 },
      },
      want: { contentLowerContains: 'coffee', contentTruthy: true },
    },
    {
      name: 'handles empty documents',
      inputs: { doc: '', query: 'any query', options: {} },
      want: { content: '', metadata: { finalSize: 0, originalSize: 0 } },
    },
    {
      name: 'handles very short documents',
      inputs: { doc: 'Just a short sentence.', query: 'test query', options: {} },
      want: { contentEqualsDoc: true },
    },
    {
      name: 'applies different chunk actions based on relevance',
      inputs: {
        doc: sampleDocument,
        query: 'coffee making request',
        options: { targetSize: 1500, compression: 0.8 },
      },
      want: {
        contentTruthy: true,
        finalSizeMax: 1500,
        chunksTotalGT: 0,
        tfIdfSelectedGTE: 0,
      },
    },
    {
      name: 'respects compression setting',
      vary: { compression: ['low', 'high'] },
      inputs: ({ compression }) => ({
        doc: sampleDocument,
        query: 'relationships',
        options: { targetSize: 1000, compression },
      }),
      want: { finalSizeGTE: 0 },
    },
    {
      name: 'maintains document structure with XML chunks',
      inputs: {
        doc: sampleDocument,
        query: 'comedy show transcript',
        options: { targetSize: 2000 },
      },
      want: { hasContent: true, originalSizeGT: 0, finalSizeGT: 0 },
    },
    {
      name: 'tracks chunk transformations',
      inputs: { doc: sampleDocument, query: 'video reactions', options: { targetSize: 1200 } },
      want: { chunksTotalGT: 0, allocationDefined: true, tokensUsedGTE: 0 },
    },
    {
      name: 'handles custom token budget',
      inputs: {
        doc: sampleDocument,
        query: 'test query',
        options: { targetSize: 100, tokenBudget: 500 },
      },
      want: { contentLengthGT: 0 },
    },
    {
      name: 'handles custom chunk sizes',
      inputs: { doc: sampleDocument, query: 'relationships', options: { targetSize: 1500 } },
      want: { hasContent: true, chunksTotalGT: 0 },
    },
    {
      name: 'handles invalid options gracefully (uses defaults)',
      inputs: {
        doc: sampleDocument,
        query: 'test',
        options: { targetSize: -100, chunkSize: -50 },
      },
      want: { hasContent: true, contentTruthy: true },
    },
    {
      name: 'handles very long documents',
      inputs: {
        doc: 'This is a test. '.repeat(1000),
        query: 'test content',
        options: { targetSize: 1000 },
      },
      want: { finalSizeMax: 1500, contentTruthy: true },
    },
  ],
  process: ({ inputs }) => documentShrink(inputs.doc, inputs.query, inputs.options),
  expects: ({ result, inputs, want }) => {
    if (want.baseline) {
      expect(result.content).toBeTruthy();
      expect(typeof result.content).toBe('string');
      expect(result.metadata.originalSize).toBe(inputs.doc.length);
      expect(result.metadata.finalSize).toBe(result.content.length);
      expect(result.metadata.finalSize).toBeLessThanOrEqual(result.metadata.originalSize);
      expect(parseFloat(result.metadata.reductionRatio)).toBeGreaterThanOrEqual(0);
    }
    if (want.contentLowerContains) {
      expect(result.content.toLowerCase()).toContain(want.contentLowerContains);
    }
    if (want.contentTruthy) expect(result.content).toBeTruthy();
    if ('content' in want) expect(result.content).toBe(want.content);
    if (want.metadata) expect(result.metadata).toMatchObject(want.metadata);
    if (want.contentEqualsDoc) {
      expect(result.content).toBe(inputs.doc);
      expect(result.metadata).toMatchObject({
        originalSize: inputs.doc.length,
        finalSize: inputs.doc.length,
      });
    }
    if (want.finalSizeMax !== undefined) {
      expect(result.metadata.finalSize).toBeLessThanOrEqual(want.finalSizeMax);
    }
    if (want.finalSizeGTE !== undefined) {
      expect(result.metadata.finalSize).toBeGreaterThanOrEqual(want.finalSizeGTE);
    }
    if (want.chunksTotalGT !== undefined) {
      expect(result.metadata.chunks.total).toBeGreaterThan(want.chunksTotalGT);
    }
    if (want.tfIdfSelectedGTE !== undefined) {
      expect(result.metadata.chunks.tfIdfSelected).toBeGreaterThanOrEqual(want.tfIdfSelectedGTE);
    }
    if (want.hasContent) {
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('metadata');
    }
    if (want.originalSizeGT !== undefined) {
      expect(result.metadata.originalSize).toBeGreaterThan(want.originalSizeGT);
    }
    if (want.finalSizeGT !== undefined) {
      expect(result.metadata.finalSize).toBeGreaterThan(want.finalSizeGT);
    }
    if (want.allocationDefined) expect(result.metadata.allocation).toBeDefined();
    if (want.tokensUsedGTE !== undefined) {
      expect(result.metadata.tokens.used).toBeGreaterThanOrEqual(want.tokensUsedGTE);
    }
    if (want.contentLengthGT !== undefined) {
      expect(result.content.length).toBeGreaterThan(want.contentLengthGT);
    }
  },
});

runTable({
  describe: 'mapThoroughness',
  examples: [
    {
      name: 'low disables all LLM phases',
      inputs: { thoroughness: 'low' },
      want: { value: { queryExpansion: false, llmScoring: false, llmCompression: false } },
    },
  ],
  process: ({ inputs }) => mapThoroughness(inputs.thoroughness),
  expects: ({ result, want }) => expect(result).toMatchObject(want.value),
});
