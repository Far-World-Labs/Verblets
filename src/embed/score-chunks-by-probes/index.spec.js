import { describe, it, expect } from 'vitest';
import scoreChunksByProbes from './index.js';

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

describe('scoreChunksByProbes', () => {
  it('scores a matching chunk×probe pair', () => {
    const chunks = [{ text: 'John Smith', start: 0, end: 10, vector: axis(0) }];

    const result = scoreChunksByProbes(chunks, probes);

    const topHit = result[0];
    expect(topHit.category).toBe('pii-name');
    expect(topHit.label).toBe('Personal Names');
    expect(topHit.score).toBeCloseTo(1.0, 5);
    expect(topHit.chunk).toEqual({ text: 'John Smith', start: 0, end: 10 });
  });

  it('returns all chunk×probe pairs sorted by score descending', () => {
    const chunks = [
      { text: 'chunk A', start: 0, end: 7, vector: axis(0) },
      { text: 'chunk B', start: 10, end: 17, vector: axis(1) },
    ];

    const result = scoreChunksByProbes(chunks, probes);

    // 2 chunks × 3 probes = 6 pairs
    expect(result).toHaveLength(6);
    // Top two should be the exact matches (score 1.0)
    expect(result[0].score).toBeCloseTo(1.0, 5);
    expect(result[1].score).toBeCloseTo(1.0, 5);
    // Rest should be 0
    for (let i = 2; i < result.length; i++) {
      expect(result[i].score).toBeCloseTo(0.0, 5);
    }
  });

  it('returns scores sorted descending', () => {
    const chunkA = new Float32Array(8);
    chunkA[0] = 0.5;
    const chunkB = new Float32Array(8);
    chunkB[0] = 0.9;

    const chunks = [
      { text: 'chunk A', start: 0, end: 7, vector: chunkA },
      { text: 'chunk B', start: 10, end: 17, vector: chunkB },
    ];

    const result = scoreChunksByProbes(chunks, probes);

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  it('returns empty array for empty chunks', () => {
    expect(scoreChunksByProbes([], probes)).toEqual([]);
  });

  it('returns empty array for empty probes', () => {
    const chunks = [{ text: 'text', start: 0, end: 4, vector: axis(0) }];
    expect(scoreChunksByProbes(chunks, [])).toEqual([]);
  });

  it('works with any probe set — not coupled to privacy', () => {
    const topicProbes = [
      { category: 'cooking', label: 'Cooking', vector: axis(3) },
      { category: 'sports', label: 'Sports', vector: axis(4) },
    ];
    const chunks = [{ text: 'recipe for cake', start: 0, end: 15, vector: axis(3) }];

    const result = scoreChunksByProbes(chunks, topicProbes);

    expect(result[0].category).toBe('cooking');
    expect(result[0].score).toBeCloseTo(1.0, 5);
  });

  it('caller can filter by threshold after the fact', () => {
    const weakMatch = new Float32Array(8);
    weakMatch[0] = 0.3;
    const chunks = [{ text: 'weak signal', start: 0, end: 11, vector: weakMatch }];

    const result = scoreChunksByProbes(chunks, probes);
    const strict = result.filter((h) => h.score >= 0.4);
    const lenient = result.filter((h) => h.score >= 0.2);

    expect(strict).toHaveLength(0);
    expect(lenient).toHaveLength(1);
    expect(lenient[0].score).toBeCloseTo(0.3, 5);
  });
});
