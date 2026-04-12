import { describe, it, expect } from 'vitest';
import { sortBy } from '../../lib/pure/index.js';
import scoreVectors from './index.js';

const vec = (...vals) => new Float32Array(vals);

describe('scoreVectors', () => {
  it('returns [{item, score}] aligned with input order', () => {
    const query = vec(1, 0, 0, 0);
    const items = [
      { id: 'a', v: vec(1, 0, 0, 0) },
      { id: 'b', v: vec(0, 1, 0, 0) },
    ];

    const result = scoreVectors(query, items, { accessor: (i) => i.v });

    expect(result).toHaveLength(2);
    expect(result[0].item.id).toBe('a');
    expect(result[0].score).toBeCloseTo(1.0, 5);
    expect(result[1].item.id).toBe('b');
    expect(result[1].score).toBeCloseTo(0.0, 5);
  });

  it('returns empty array for empty input', () => {
    const result = scoreVectors(vec(1, 0, 0, 0), []);
    expect(result).toEqual([]);
  });

  it('defaults accessor to identity (items are vectors)', () => {
    const query = vec(1, 0, 0, 0);
    const items = [vec(1, 0, 0, 0), vec(0, 1, 0, 0)];

    const result = scoreVectors(query, items);

    expect(result[0].score).toBeCloseTo(1.0, 5);
    expect(result[1].score).toBeCloseTo(0.0, 5);
  });

  it('composes with .filter() for threshold-based selection', () => {
    const query = vec(1, 0, 0, 0);
    const items = [
      { label: 'match', v: vec(0.9, 0.4, 0, 0) },
      { label: 'miss', v: vec(0, 0, 1, 0) },
      { label: 'partial', v: vec(0.8, 0.5, 0, 0) },
    ];

    const scored = scoreVectors(query, items, { accessor: (i) => i.v });
    const filtered = scored.filter((s) => s.score > 0.5).map((s) => s.item.label);

    expect(filtered).toContain('match');
    expect(filtered).toContain('partial');
    expect(filtered).not.toContain('miss');
  });

  it('composes with .toSorted(sortBy()) for ranking', () => {
    const query = vec(1, 0, 0, 0);
    const items = [
      { label: 'low', v: vec(0.3, 0.9, 0, 0) },
      { label: 'high', v: vec(0.95, 0.05, 0, 0) },
      { label: 'medium', v: vec(0.6, 0.6, 0, 0) },
    ];

    const scored = scoreVectors(query, items, { accessor: (i) => i.v });
    const ranked = scored.toSorted(sortBy((s) => -s.score)).map((s) => s.item.label);

    expect(ranked[0]).toBe('high');
    expect(ranked[ranked.length - 1]).toBe('low');
  });
});
