import { expect } from 'chai';
import { vi, describe, beforeEach, it } from 'vitest';
import detectPatterns, { mapThoroughness } from './index.js';

vi.mock('../reduce/index.js', () => ({
  default: vi.fn(),
}));

import reduce from '../reduce/index.js';

describe('mapThoroughness', () => {
  it('returns default (capacity 50, topN 5) when undefined', () => {
    expect(mapThoroughness(undefined)).to.deep.equal({ capacity: 50, topN: 5 });
  });

  it('maps low to small accumulator with fewer results', () => {
    expect(mapThoroughness('low')).to.deep.equal({ capacity: 20, topN: 3 });
  });

  it('maps high to large accumulator with more results', () => {
    expect(mapThoroughness('high')).to.deep.equal({ capacity: 100, topN: 10 });
  });

  it('passes through object for power consumers', () => {
    const custom = { capacity: 75, topN: 8 };
    expect(mapThoroughness(custom)).to.equal(custom);
  });

  it('falls back to default on unknown string', () => {
    expect(mapThoroughness('extreme')).to.deep.equal({ capacity: 50, topN: 5 });
  });
});

describe('detect-patterns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array for empty input', async () => {
    reduce.mockResolvedValueOnce([]);
    const result = await detectPatterns([]);
    expect(result).to.deep.equal([]);
  });

  it('should process objects and return pattern templates', async () => {
    const mockResult = [
      {
        type: 'pattern',
        template: { theme: { values: ['dark', 'light'] }, fontSize: { range: [12, 16] } },
        count: 5,
      },
      {
        type: 'pattern',
        template: { category: { values: ['books'] }, price: { range: [10, 20] } },
        count: 3,
      },
    ];

    reduce.mockResolvedValueOnce(mockResult);

    const objects = [
      { theme: 'dark', fontSize: 14 },
      { theme: 'light', fontSize: 12 },
    ];

    const result = await detectPatterns(objects, { topN: 2 });

    expect(result).to.be.an('array');
    expect(result).to.have.length(2);
    expect(result[0]).to.deep.equal({
      theme: { values: ['dark', 'light'] },
      fontSize: { range: [12, 16] },
    });
    expect(result[1]).to.deep.equal({
      category: { values: ['books'] },
      price: { range: [10, 20] },
    });
  });

  it('should handle JSON with code blocks', async () => {
    const mockResult = [
      {
        type: 'pattern',
        template: { theme: { values: ['dark'] } },
        count: 3,
      },
      {
        type: 'pattern',
        template: { size: { range: [10, 20] } },
        count: 2,
      },
    ];

    reduce.mockResolvedValueOnce(mockResult);

    const objects = [{ theme: 'dark' }];
    const result = await detectPatterns(objects, { topN: 2 });

    expect(result).to.have.length(2);
    expect(result[0]).to.deep.equal({ theme: { values: ['dark'] } });
  });

  it('should handle malformed JSON gracefully', async () => {
    reduce.mockResolvedValueOnce('not an array');

    const objects = [{ theme: 'dark' }];
    const result = await detectPatterns(objects, { topN: 2 });

    expect(result).to.deep.equal([]);
  });

  it('should use low capacity in reduce prompt with thoroughness low', async () => {
    reduce.mockResolvedValueOnce([]);

    await detectPatterns([{ a: 1 }], { thoroughness: 'low' });

    const reduceCall = reduce.mock.calls[0];
    const instructions = reduceCall[1];
    expect(instructions).to.include('Maximum 20 total items');
  });

  it('should use high capacity in reduce prompt with thoroughness high', async () => {
    reduce.mockResolvedValueOnce([]);

    await detectPatterns([{ a: 1 }], { thoroughness: 'high' });

    const reduceCall = reduce.mock.calls[0];
    const instructions = reduceCall[1];
    expect(instructions).to.include('Maximum 100 total items');
  });

  it('should respect topN limit', async () => {
    const mockResult = [
      {
        type: 'pattern',
        template: { a: 1 },
        count: 5,
      },
      {
        type: 'pattern',
        template: { b: 2 },
        count: 4,
      },
      {
        type: 'pattern',
        template: { c: 3 },
        count: 3,
      },
    ];

    reduce.mockResolvedValueOnce(mockResult);

    const objects = [{ a: 1 }];
    const result = await detectPatterns(objects, { topN: 2 });

    expect(result).to.have.length(2);
  });
});
