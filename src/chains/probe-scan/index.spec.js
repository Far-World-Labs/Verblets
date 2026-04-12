import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../embed/local/index.js', () => ({
  embedChunked: vi.fn(),
}));

const { embedChunked } = await import('../../embed/local/index.js');
const { default: probeScan } = await import('./index.js');

beforeEach(() => {
  embedChunked.mockReset();
});

// Helper: create a unit vector pointing along axis `i` in `dim` dimensions
const axis = (i, dim = 8) => {
  const v = new Float32Array(dim);
  v[i] = 1;
  return v;
};

const probes = [
  { category: 'pii-name', label: 'Personal Names', vector: axis(0) },
  { category: 'contact-email', label: 'Email Addresses', vector: axis(1) },
  { category: 'financial-card', label: 'Payment Cards', vector: axis(2) },
];

describe('probeScan', () => {
  it('detects a matching category above threshold', async () => {
    embedChunked.mockResolvedValueOnce([
      { text: 'John Smith', start: 0, end: 10, vector: axis(0) },
    ]);

    const result = await probeScan('John Smith', probes);

    expect(result.flagged).toBe(true);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].category).toBe('pii-name');
    expect(result.hits[0].label).toBe('Personal Names');
    expect(result.hits[0].score).toBeCloseTo(1.0, 5);
    expect(result.hits[0].chunk).toEqual({ text: 'John Smith', start: 0, end: 10 });
  });

  it('returns flagged: false when nothing above threshold', async () => {
    // Vector orthogonal to all probes
    embedChunked.mockResolvedValueOnce([
      { text: 'weather forecast', start: 0, end: 16, vector: axis(5) },
    ]);

    const result = await probeScan('weather forecast', probes);

    expect(result.flagged).toBe(false);
    expect(result.hits).toHaveLength(0);
  });

  it('filters by category list when provided', async () => {
    const mixed = new Float32Array(8);
    mixed[0] = 0.7;
    mixed[1] = 0.7;
    embedChunked.mockResolvedValueOnce([
      { text: 'john@example.com', start: 0, end: 16, vector: mixed },
    ]);

    const result = await probeScan('john@example.com', probes, {
      categories: ['contact-email'],
    });

    expect(result.flagged).toBe(true);
    expect(result.hits.every((h) => h.category === 'contact-email')).toBe(true);
  });

  it('returns all chunk×category matches sorted by score descending', async () => {
    const chunkA = new Float32Array(8);
    chunkA[0] = 0.5;
    const chunkB = new Float32Array(8);
    chunkB[0] = 0.9;

    embedChunked.mockResolvedValueOnce([
      { text: 'chunk A', start: 0, end: 7, vector: chunkA },
      { text: 'chunk B', start: 10, end: 17, vector: chunkB },
    ]);

    const result = await probeScan('chunk A... chunk B', probes, { detection: 0.4 });

    expect(result.flagged).toBe(true);
    expect(result.hits).toHaveLength(2);
    expect(result.hits[0].score).toBeGreaterThanOrEqual(result.hits[1].score);
    expect(result.hits[0].chunk.text).toBe('chunk B');
    expect(result.hits[1].chunk.text).toBe('chunk A');
  });

  it('passes maxTokens through to embedChunked', async () => {
    embedChunked.mockResolvedValueOnce([]);

    await probeScan('some text', probes, { maxTokens: 128 });

    expect(embedChunked).toHaveBeenCalledWith('some text', { maxTokens: 128 });
  });

  it('respects custom detection threshold (raw number)', async () => {
    const weakMatch = new Float32Array(8);
    weakMatch[0] = 0.3;

    embedChunked.mockResolvedValueOnce([
      { text: 'weak signal', start: 0, end: 11, vector: weakMatch },
    ]);

    const strict = await probeScan('weak signal', probes, { detection: 0.4 });
    expect(strict.flagged).toBe(false);

    embedChunked.mockResolvedValueOnce([
      { text: 'weak signal', start: 0, end: 11, vector: weakMatch },
    ]);

    const lenient = await probeScan('weak signal', probes, { detection: 0.2 });
    expect(lenient.flagged).toBe(true);
    expect(lenient.hits[0].score).toBeCloseTo(0.3, 5);
  });

  it('detection low raises threshold (fewer hits)', async () => {
    // Score of 0.5 — above default (0.4) but below low threshold (0.55)
    const midMatch = new Float32Array(8);
    midMatch[0] = 0.5;

    embedChunked.mockResolvedValueOnce([
      { text: 'mid signal', start: 0, end: 10, vector: midMatch },
    ]);

    const result = await probeScan('mid signal', probes, { detection: 'low' });
    expect(result.flagged).toBe(false);
  });

  it('detection high lowers threshold (more hits)', async () => {
    // Score of 0.35 — below default (0.4) but above high threshold (0.3)
    const weakMatch = new Float32Array(8);
    weakMatch[0] = 0.35;

    embedChunked.mockResolvedValueOnce([
      { text: 'weak signal', start: 0, end: 11, vector: weakMatch },
    ]);

    const result = await probeScan('weak signal', probes, { detection: 'high' });
    expect(result.flagged).toBe(true);
    expect(result.hits[0].score).toBeCloseTo(0.35, 5);
  });

  it('accepts pre-embedded chunks and skips embedChunked', async () => {
    const preEmbedded = [{ text: 'John Smith', start: 0, end: 10, vector: axis(0) }];

    const result = await probeScan(preEmbedded, probes);

    expect(embedChunked).not.toHaveBeenCalled();
    expect(result.flagged).toBe(true);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].category).toBe('pii-name');
    expect(result.hits[0].score).toBeCloseTo(1.0, 5);
  });

  it('pre-embedded chunks produce same results as string path', async () => {
    const chunks = [{ text: 'john@example.com', start: 0, end: 16, vector: axis(1) }];

    embedChunked.mockResolvedValueOnce(chunks);
    const fromString = await probeScan('john@example.com', probes);
    const fromChunks = await probeScan(chunks, probes);

    expect(fromString.flagged).toBe(fromChunks.flagged);
    expect(fromString.hits).toEqual(fromChunks.hits);
  });

  it('works with any probe set — not coupled to privacy', async () => {
    const topicProbes = [
      { category: 'cooking', label: 'Cooking', vector: axis(3) },
      { category: 'sports', label: 'Sports', vector: axis(4) },
    ];

    embedChunked.mockResolvedValueOnce([
      { text: 'recipe for cake', start: 0, end: 15, vector: axis(3) },
    ]);

    const result = await probeScan('recipe for cake', topicProbes);

    expect(result.flagged).toBe(true);
    expect(result.hits[0].category).toBe('cooking');
  });
});
