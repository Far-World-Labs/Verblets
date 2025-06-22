import { describe, it, expect, vi } from 'vitest';
import peopleList from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async () => '[{"name":"A","description":"desc"}]'),
}));

describe('peopleList', () => {
  it('returns parsed list', async () => {
    const list = await peopleList('bakers', 1);
    expect(list).toEqual([{ name: 'A', description: 'desc' }]);
  });
});
