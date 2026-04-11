import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sortBy } from '../pure/index.js';

vi.mock('../embed-local/index.js', () => ({
  embedBatch: vi.fn(),
}));

const { embedBatch } = await import('../embed-local/index.js');
const { default: embedScore } = await import('./index.js');

beforeEach(() => {
  embedBatch.mockReset();
});

// Deterministic vectors: axis-aligned unit vectors in 4D
const vec = (...vals) => new Float32Array(vals);

describe('embedScore', () => {
  it('returns [{item, score}] aligned with input order', async () => {
    // query=[1,0,0,0], item0=[1,0,0,0] (perfect), item1=[0,1,0,0] (orthogonal)
    embedBatch.mockResolvedValueOnce([
      vec(1, 0, 0, 0), // query
      vec(1, 0, 0, 0), // "apple"
      vec(0, 1, 0, 0), // "banana"
    ]);

    const result = await embedScore(['apple', 'banana'], 'fruit');

    expect(result).toHaveLength(2);
    expect(result[0].item).toBe('apple');
    expect(result[0].score).toBeCloseTo(1.0, 5);
    expect(result[1].item).toBe('banana');
    expect(result[1].score).toBeCloseTo(0.0, 5);
  });

  it('returns empty array for empty input', async () => {
    const result = await embedScore([], 'anything');

    expect(result).toEqual([]);
    expect(embedBatch).not.toHaveBeenCalled();
  });

  it('uses accessor to extract text from objects', async () => {
    const items = [
      { id: 1, name: 'red car' },
      { id: 2, name: 'blue sky' },
    ];

    embedBatch.mockResolvedValueOnce([vec(1, 0, 0, 0), vec(0.9, 0.1, 0, 0), vec(0.1, 0.9, 0, 0)]);

    const result = await embedScore(items, 'vehicle', {
      accessor: (item) => item.name,
    });

    expect(embedBatch).toHaveBeenCalledWith(['vehicle', 'red car', 'blue sky'], {
      abortSignal: undefined,
    });
    expect(result[0].item).toBe(items[0]);
    expect(result[1].item).toBe(items[1]);
  });

  it('composes with .filter().map() for threshold-based selection', async () => {
    embedBatch.mockResolvedValueOnce([
      vec(1, 0, 0, 0), // query
      vec(0.9, 0.4, 0, 0), // high similarity
      vec(0, 0, 1, 0), // no similarity
      vec(0.8, 0.5, 0, 0), // moderate similarity
    ]);

    const scored = await embedScore(['match', 'miss', 'partial'], 'query');
    const filtered = scored.filter((s) => s.score > 0.5).map((s) => s.item);

    expect(filtered).toContain('match');
    expect(filtered).toContain('partial');
    expect(filtered).not.toContain('miss');
  });

  it('composes with .toSorted(sortBy()) for ranking', async () => {
    embedBatch.mockResolvedValueOnce([
      vec(1, 0, 0, 0),
      vec(0.3, 0.9, 0, 0), // low
      vec(0.95, 0.05, 0, 0), // high
      vec(0.6, 0.6, 0, 0), // medium
    ]);

    const scored = await embedScore(['low', 'high', 'medium'], 'query');
    const ranked = scored.toSorted(sortBy((s) => -s.score)).map((s) => s.item);

    expect(ranked[0]).toBe('high');
    expect(ranked[ranked.length - 1]).toBe('low');
  });
});
