import { describe, it, expect, vi, beforeEach } from 'vitest';
import detectPatterns from './index.js';

vi.mock('../reduce/index.js', () => ({
  default: vi.fn(),
}));

import reduce from '../reduce/index.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('detect-patterns', () => {
  it('extracts pattern templates sorted by count, limited by topN', async () => {
    reduce.mockResolvedValueOnce([
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
      {
        type: 'pattern',
        template: { color: { values: ['red'] } },
        count: 1,
      },
    ]);

    const result = await detectPatterns(
      [
        { theme: 'dark', fontSize: 14 },
        { theme: 'light', fontSize: 12 },
      ],
      { topN: 2 }
    );

    expect(result).toStrictEqual([
      { theme: { values: ['dark', 'light'] }, fontSize: { range: [12, 16] } },
      { category: { values: ['books'] }, price: { range: [10, 20] } },
    ]);
  });

  it('returns empty array for empty input', async () => {
    reduce.mockResolvedValueOnce([]);
    expect(await detectPatterns([])).toStrictEqual([]);
  });

  it('throws on malformed reduce response (not an array)', async () => {
    reduce.mockResolvedValueOnce('not an array');
    await expect(detectPatterns([{ a: 1 }])).rejects.toThrow(/expected pattern candidates array/);
  });

  it('throws on non-array input', async () => {
    await expect(detectPatterns('not array')).rejects.toThrow(/objects must be an array/);
  });

  it('thoroughness low limits capacity in reduce prompt', async () => {
    reduce.mockResolvedValueOnce([]);
    await detectPatterns([{ a: 1 }], { thoroughness: 'low' });
    expect(reduce.mock.calls[0][1]).toContain('Maximum 20 total items');
  });

  it('thoroughness high increases capacity in reduce prompt', async () => {
    reduce.mockResolvedValueOnce([]);
    await detectPatterns([{ a: 1 }], { thoroughness: 'high' });
    expect(reduce.mock.calls[0][1]).toContain('Maximum 100 total items');
  });
});
