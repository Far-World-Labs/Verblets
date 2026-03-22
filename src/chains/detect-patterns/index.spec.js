import { expect } from 'chai';
import { vi, describe, beforeEach, it } from 'vitest';
import detectPatterns from './index.js';

vi.mock('../reduce/index.js', () => ({
  default: vi.fn(),
}));

import reduce from '../reduce/index.js';

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
