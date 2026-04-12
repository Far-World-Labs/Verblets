import { describe, it, expect } from 'vitest';
import { meanVector, normalize, dotAxisScore, scaleVector, magnitude } from './index.js';

const vec = (...vals) => new Float32Array(vals);

describe('meanVector', () => {
  it('returns undefined for empty input', () => {
    expect(meanVector([])).toBeUndefined();
  });

  it('returns a copy for a single vector', () => {
    const v = vec(1, 2, 3);
    const result = meanVector([v]);
    expect([...result]).toEqual([1, 2, 3]);
    expect(result).not.toBe(v);
  });

  it('computes element-wise mean of two vectors', () => {
    const a = vec(2, 4, 6);
    const b = vec(4, 8, 2);
    const result = meanVector([a, b]);
    expect([...result]).toEqual([3, 6, 4]);
  });

  it('computes element-wise mean of three vectors', () => {
    const a = vec(3, 0, 0);
    const b = vec(0, 6, 0);
    const c = vec(0, 0, 9);
    const result = meanVector([a, b, c]);
    expect([...result]).toEqual([1, 2, 3]);
  });
});

describe('normalize', () => {
  it('normalizes a vector to unit length', () => {
    const v = vec(3, 4, 0);
    const result = normalize(v);
    const mag = Math.sqrt(result[0] ** 2 + result[1] ** 2 + result[2] ** 2);
    expect(mag).toBeCloseTo(1, 5);
    expect(result[0]).toBeCloseTo(0.6, 5);
    expect(result[1]).toBeCloseTo(0.8, 5);
  });

  it('returns zero vector for zero input', () => {
    const result = normalize(vec(0, 0, 0));
    expect([...result]).toEqual([0, 0, 0]);
  });

  it('does not mutate the input', () => {
    const v = vec(3, 4, 0);
    normalize(v);
    expect([...v]).toEqual([3, 4, 0]);
  });
});

describe('dotAxisScore', () => {
  it('returns positive when vec is closer to highPole', () => {
    const v = normalize(vec(1, 0, 0));
    const low = normalize(vec(-1, 0, 0));
    const high = normalize(vec(1, 0, 0));
    expect(dotAxisScore(v, low, high)).toBeCloseTo(2, 5);
  });

  it('returns negative when vec is closer to lowPole', () => {
    const v = normalize(vec(-1, 0, 0));
    const low = normalize(vec(-1, 0, 0));
    const high = normalize(vec(1, 0, 0));
    expect(dotAxisScore(v, low, high)).toBeCloseTo(-2, 5);
  });

  it('returns near zero for orthogonal vector', () => {
    const v = normalize(vec(0, 1, 0));
    const low = normalize(vec(-1, 0, 0));
    const high = normalize(vec(1, 0, 0));
    expect(dotAxisScore(v, low, high)).toBeCloseTo(0, 5);
  });

  it('returns intermediate scores for angled vectors', () => {
    const v = normalize(vec(1, 1, 0));
    const low = normalize(vec(-1, 0, 0));
    const high = normalize(vec(1, 0, 0));
    const score = dotAxisScore(v, low, high);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(2);
  });
});

describe('scaleVector', () => {
  it('multiplies each element by the factor', () => {
    const result = scaleVector(vec(1, 2, 3), 2);
    expect([...result]).toEqual([2, 4, 6]);
  });

  it('handles zero factor', () => {
    const result = scaleVector(vec(1, 2, 3), 0);
    expect([...result]).toEqual([0, 0, 0]);
  });

  it('handles negative factor', () => {
    const result = scaleVector(vec(1, -2, 3), -1);
    expect([...result]).toEqual([-1, 2, -3]);
  });

  it('does not mutate the input', () => {
    const v = vec(1, 2, 3);
    scaleVector(v, 5);
    expect([...v]).toEqual([1, 2, 3]);
  });
});

describe('magnitude', () => {
  it('computes L2 norm', () => {
    expect(magnitude(vec(3, 4, 0))).toBeCloseTo(5, 5);
  });

  it('returns 0 for zero vector', () => {
    expect(magnitude(vec(0, 0, 0))).toBe(0);
  });

  it('returns 1 for a normalized vector', () => {
    expect(magnitude(normalize(vec(7, 3, 2)))).toBeCloseTo(1, 5);
  });
});
