import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../embed/index.js', () => ({
  embedBatch: vi.fn(),
}));

const { embedBatch } = await import('../embed/index.js');
const { default: embedProbes, clearProbeCache } = await import('./index.js');

beforeEach(() => {
  clearProbeCache();
  embedBatch.mockReset();
});

const testProbes = [
  { category: 'topic-a', label: 'Topic A', queries: ['about topic A'] },
  { category: 'topic-b', label: 'Topic B', queries: ['about topic B'] },
];

const fakeVectors = testProbes.map((_, i) => new Float32Array([i, i + 1, i + 2]));

describe('embedProbes', () => {
  it('returns one entry per probe with category, label, and vector', async () => {
    embedBatch.mockResolvedValueOnce(fakeVectors);

    const result = await embedProbes(testProbes);

    expect(result).toHaveLength(testProbes.length);
    expect(result[0]).toEqual({
      category: 'topic-a',
      label: 'Topic A',
      vector: fakeVectors[0],
    });
    expect(result[1].category).toBe('topic-b');
  });

  it('embeds only the first query string from each probe', async () => {
    const multiQueryProbes = [
      { category: 'x', label: 'X', queries: ['first query', 'second query'] },
    ];
    embedBatch.mockResolvedValueOnce([new Float32Array([1, 2, 3])]);

    await embedProbes(multiQueryProbes);

    expect(embedBatch.mock.calls[0][0]).toEqual(['first query']);
  });

  it('caches by reference — same array returns same promise', async () => {
    embedBatch.mockResolvedValueOnce(fakeVectors);

    const first = await embedProbes(testProbes);
    const second = await embedProbes(testProbes);

    expect(embedBatch).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('different probe arrays get separate cache entries', async () => {
    const otherProbes = [{ category: 'other', label: 'Other', queries: ['other'] }];
    embedBatch
      .mockResolvedValueOnce(fakeVectors)
      .mockResolvedValueOnce([new Float32Array([9, 9, 9])]);

    const first = await embedProbes(testProbes);
    const second = await embedProbes(otherProbes);

    expect(embedBatch).toHaveBeenCalledTimes(2);
    expect(first[0].category).toBe('topic-a');
    expect(second[0].category).toBe('other');
  });

  it('clearProbeCache resets all cached entries', async () => {
    embedBatch.mockResolvedValue(fakeVectors);

    await embedProbes(testProbes);
    clearProbeCache();
    await embedProbes(testProbes);

    expect(embedBatch).toHaveBeenCalledTimes(2);
  });
});
