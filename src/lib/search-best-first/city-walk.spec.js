import { describe, expect, it } from 'vitest';
import searchBestFirst from './index.js';

describe('searchBestFirst city walk example', () => {
  it('plans a path across the city', async () => {
    const graph = {
      start: ['museum', 'park'],
      museum: ['cafe', 'gallery'],
      park: ['cafe', 'river'],
      cafe: ['theater'],
      gallery: ['theater'],
      river: ['theater'],
      theater: ['finish'],
      finish: [],
    };

    const next = ({ node }) => graph[node] || [];

    const rank = ({ nodes }) => [...nodes].sort(() => 0.5 - Math.random());

    const visit = ({ node, state }) => ({ ...state, path: [...(state.path || []), node] });

    const { path } = await searchBestFirst({
      node: 'start',
      next,
      rank,
      visit,
      goal: ({ node }) => node === 'finish',
      state: {},
      returnPath: true,
    });

    expect(path.length).toBeGreaterThan(2);
    expect(path[0]).toBe('start');
    expect(path[path.length - 1]).toBe('finish');
  });
});
