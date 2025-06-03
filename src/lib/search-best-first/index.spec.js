import { describe, it, expect } from 'vitest';
import search from './index.js';

describe('search-best-first', () => {
  it('returns path to goal', async () => {
    const result = await search({
      node: 0,
      next: ({ node }) => [node + 1],
      rank: ({ nodes }) => nodes,
      visit: ({ node, state }) => ({ ...state, sum: (state.sum || 0) + node }),
      goal: ({ node }) => node >= 3,
      state: {},
      returnPath: true,
    });

    expect(result.state.sum).toBe(6); // 0 + 1 + 2 + 3
    expect(result.path).toEqual([0, 1, 2, 3]);
  });

  it('handles missing goal', async () => {
    const result = await search({
      node: 0,
      next: ({ node }) => (node < 2 ? [node + 1] : []),
      rank: ({ nodes }) => nodes,
      visit: ({ state }) => ({ ...state, count: (state.count || 0) + 1 }),
      goal: ({ node }) => node === 5,
      state: {},
      returnPath: true,
    });

    expect(result.state.count).toBe(3);
    expect(result.path).toEqual([0, 1, 2]);
  });
});
