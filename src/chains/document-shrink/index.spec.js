import { vi, expect } from 'vitest';
import documentShrink, { mapThoroughness } from './index.js';
import { runTable, partial } from '../../lib/examples-runner/index.js';

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

// ─── documentShrink ───────────────────────────────────────────────────────

const examples = [
  {
    name: 'reduces a document to target size',
    inputs: {
      doc: sampleDocument,
      query: 'coffee and relationships',
      options: { targetSize: 1000, compression: 0.8 },
    },
    check: ({ result }) => {
      expect(result.content).toBeTruthy();
      expect(typeof result.content).toBe('string');
      expect(result.metadata.originalSize).toBe(sampleDocument.length);
      expect(result.metadata.finalSize).toBe(result.content.length);
      expect(result.metadata.finalSize).toBeLessThanOrEqual(result.metadata.originalSize);
      expect(parseFloat(result.metadata.reductionRatio)).toBeGreaterThanOrEqual(0);
    },
  },
  {
    name: 'preserves query-relevant content',
    inputs: {
      doc: sampleDocument,
      query: 'making coffee for partner',
      options: { targetSize: 800, compression: 0.5 },
    },
    check: ({ result }) => {
      expect(result.content.toLowerCase()).toContain('coffee');
      expect(result.content).toBeTruthy();
    },
  },
  {
    name: 'handles empty documents',
    inputs: { doc: '', query: 'any query', options: {} },
    check: ({ result }) => {
      expect(result.content).toBe('');
      expect(result.metadata).toMatchObject({ finalSize: 0, originalSize: 0 });
    },
  },
  {
    name: 'handles very short documents',
    inputs: { doc: 'Just a short sentence.', query: 'test query', options: {} },
    check: ({ result, inputs }) => {
      expect(result.content).toBe(inputs.doc);
      expect(result.metadata).toMatchObject({
        originalSize: inputs.doc.length,
        finalSize: inputs.doc.length,
      });
    },
  },
  {
    name: 'applies different chunk actions based on relevance',
    inputs: {
      doc: sampleDocument,
      query: 'coffee making request',
      options: { targetSize: 1500, compression: 0.8 },
    },
    check: ({ result }) => {
      expect(result.content).toBeTruthy();
      expect(result.metadata.finalSize).toBeLessThanOrEqual(1500);
      expect(result.metadata.chunks.total).toBeGreaterThan(0);
      expect(result.metadata.chunks.tfIdfSelected).toBeGreaterThanOrEqual(0);
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
    check: ({ result }) => {
      expect(result.metadata.finalSize).toBeGreaterThanOrEqual(0);
    },
  },
  {
    name: 'maintains document structure with XML chunks',
    inputs: {
      doc: sampleDocument,
      query: 'comedy show transcript',
      options: { targetSize: 2000 },
    },
    check: ({ result }) => {
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata.originalSize).toBeGreaterThan(0);
      expect(result.metadata.finalSize).toBeGreaterThan(0);
    },
  },
  {
    name: 'tracks chunk transformations',
    inputs: { doc: sampleDocument, query: 'video reactions', options: { targetSize: 1200 } },
    check: ({ result }) => {
      expect(result.metadata.chunks.total).toBeGreaterThan(0);
      expect(result.metadata.allocation).toBeDefined();
      expect(result.metadata.tokens.used).toBeGreaterThanOrEqual(0);
    },
  },
  {
    name: 'handles custom token budget',
    inputs: {
      doc: sampleDocument,
      query: 'test query',
      options: { targetSize: 100, tokenBudget: 500 },
    },
    check: ({ result }) => expect(result.content.length).toBeGreaterThan(0),
  },
  {
    name: 'handles custom chunk sizes',
    inputs: { doc: sampleDocument, query: 'relationships', options: { targetSize: 1500 } },
    check: ({ result }) => {
      expect(result).toHaveProperty('content');
      expect(result.metadata.chunks.total).toBeGreaterThan(0);
    },
  },
  {
    name: 'handles invalid options gracefully (uses defaults)',
    inputs: {
      doc: sampleDocument,
      query: 'test',
      options: { targetSize: -100, chunkSize: -50 },
    },
    check: ({ result }) => {
      expect(result).toHaveProperty('content');
      expect(result.content).toBeTruthy();
    },
  },
  {
    name: 'handles very long documents',
    inputs: {
      doc: 'This is a test. '.repeat(1000),
      query: 'test content',
      options: { targetSize: 1000 },
    },
    check: ({ result }) => {
      expect(result.metadata.finalSize).toBeLessThanOrEqual(1500);
      expect(result.content).toBeTruthy();
    },
  },
];

runTable({
  describe: 'documentShrink',
  examples,
  process: ({ doc, query, options }) => documentShrink(doc, query, options),
});

// ─── mapThoroughness ──────────────────────────────────────────────────────

runTable({
  describe: 'mapThoroughness',
  examples: [
    {
      name: 'low disables all LLM phases',
      inputs: { thoroughness: 'low' },
      check: partial({ queryExpansion: false, llmScoring: false, llmCompression: false }),
    },
  ],
  process: ({ thoroughness }) => mapThoroughness(thoroughness),
});
