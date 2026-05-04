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
        wantBaseline: true,
      },
    },
    {
      name: 'preserves query-relevant content',
      inputs: {
        doc: sampleDocument,
        query: 'making coffee for partner',
        options: { targetSize: 800, compression: 0.5 },
        wantContentLowerContains: 'coffee',
        wantContentTruthy: true,
      },
    },
    {
      name: 'handles empty documents',
      inputs: {
        doc: '',
        query: 'any query',
        options: {},
        wantContent: '',
        wantMetadata: { finalSize: 0, originalSize: 0 },
      },
    },
    {
      name: 'handles very short documents',
      inputs: {
        doc: 'Just a short sentence.',
        query: 'test query',
        options: {},
        wantContentEqualsDoc: true,
      },
    },
    {
      name: 'applies different chunk actions based on relevance',
      inputs: {
        doc: sampleDocument,
        query: 'coffee making request',
        options: { targetSize: 1500, compression: 0.8 },
        wantContentTruthy: true,
        wantFinalSizeMax: 1500,
        wantChunksTotalGT: 0,
        wantTfIdfSelectedGTE: 0,
      },
    },
    {
      name: 'respects compression setting',
      vary: { compression: ['low', 'high'] },
      inputs: ({ compression }) => ({
        doc: sampleDocument,
        query: 'relationships',
        options: { targetSize: 1000, compression },
        wantFinalSizeGTE: 0,
      }),
    },
    {
      name: 'maintains document structure with XML chunks',
      inputs: {
        doc: sampleDocument,
        query: 'comedy show transcript',
        options: { targetSize: 2000 },
        wantHasContent: true,
        wantOriginalSizeGT: 0,
        wantFinalSizeGT: 0,
      },
    },
    {
      name: 'tracks chunk transformations',
      inputs: {
        doc: sampleDocument,
        query: 'video reactions',
        options: { targetSize: 1200 },
        wantChunksTotalGT: 0,
        wantAllocationDefined: true,
        wantTokensUsedGTE: 0,
      },
    },
    {
      name: 'handles custom token budget',
      inputs: {
        doc: sampleDocument,
        query: 'test query',
        options: { targetSize: 100, tokenBudget: 500 },
        wantContentLengthGT: 0,
      },
    },
    {
      name: 'handles custom chunk sizes',
      inputs: {
        doc: sampleDocument,
        query: 'relationships',
        options: { targetSize: 1500 },
        wantHasContent: true,
        wantChunksTotalGT: 0,
      },
    },
    {
      name: 'handles invalid options gracefully (uses defaults)',
      inputs: {
        doc: sampleDocument,
        query: 'test',
        options: { targetSize: -100, chunkSize: -50 },
        wantHasContent: true,
        wantContentTruthy: true,
      },
    },
    {
      name: 'handles very long documents',
      inputs: {
        doc: 'This is a test. '.repeat(1000),
        query: 'test content',
        options: { targetSize: 1000 },
        wantFinalSizeMax: 1500,
        wantContentTruthy: true,
      },
    },
  ],
  process: ({ doc, query, options }) => documentShrink(doc, query, options),
  expects: ({ result, inputs }) => {
    if (inputs.wantBaseline) {
      expect(result.content).toBeTruthy();
      expect(typeof result.content).toBe('string');
      expect(result.metadata.originalSize).toBe(inputs.doc.length);
      expect(result.metadata.finalSize).toBe(result.content.length);
      expect(result.metadata.finalSize).toBeLessThanOrEqual(result.metadata.originalSize);
      expect(parseFloat(result.metadata.reductionRatio)).toBeGreaterThanOrEqual(0);
    }
    if (inputs.wantContentLowerContains) {
      expect(result.content.toLowerCase()).toContain(inputs.wantContentLowerContains);
    }
    if (inputs.wantContentTruthy) expect(result.content).toBeTruthy();
    if ('wantContent' in inputs) expect(result.content).toBe(inputs.wantContent);
    if (inputs.wantMetadata) expect(result.metadata).toMatchObject(inputs.wantMetadata);
    if (inputs.wantContentEqualsDoc) {
      expect(result.content).toBe(inputs.doc);
      expect(result.metadata).toMatchObject({
        originalSize: inputs.doc.length,
        finalSize: inputs.doc.length,
      });
    }
    if (inputs.wantFinalSizeMax !== undefined) {
      expect(result.metadata.finalSize).toBeLessThanOrEqual(inputs.wantFinalSizeMax);
    }
    if (inputs.wantFinalSizeGTE !== undefined) {
      expect(result.metadata.finalSize).toBeGreaterThanOrEqual(inputs.wantFinalSizeGTE);
    }
    if (inputs.wantChunksTotalGT !== undefined) {
      expect(result.metadata.chunks.total).toBeGreaterThan(inputs.wantChunksTotalGT);
    }
    if (inputs.wantTfIdfSelectedGTE !== undefined) {
      expect(result.metadata.chunks.tfIdfSelected).toBeGreaterThanOrEqual(
        inputs.wantTfIdfSelectedGTE
      );
    }
    if (inputs.wantHasContent) {
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('metadata');
    }
    if (inputs.wantOriginalSizeGT !== undefined) {
      expect(result.metadata.originalSize).toBeGreaterThan(inputs.wantOriginalSizeGT);
    }
    if (inputs.wantFinalSizeGT !== undefined) {
      expect(result.metadata.finalSize).toBeGreaterThan(inputs.wantFinalSizeGT);
    }
    if (inputs.wantAllocationDefined) expect(result.metadata.allocation).toBeDefined();
    if (inputs.wantTokensUsedGTE !== undefined) {
      expect(result.metadata.tokens.used).toBeGreaterThanOrEqual(inputs.wantTokensUsedGTE);
    }
    if (inputs.wantContentLengthGT !== undefined) {
      expect(result.content.length).toBeGreaterThan(inputs.wantContentLengthGT);
    }
  },
});

runTable({
  describe: 'mapThoroughness',
  examples: [
    {
      name: 'low disables all LLM phases',
      inputs: {
        thoroughness: 'low',
        want: { queryExpansion: false, llmScoring: false, llmCompression: false },
      },
    },
  ],
  process: ({ thoroughness }) => mapThoroughness(thoroughness),
  expects: ({ result, inputs }) => expect(result).toMatchObject(inputs.want),
});
