import { describe, expect, it, vi } from 'vitest';
import nameSimilarTo from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async () => 'freshName'),
}));

describe('nameSimilarTo verblet', () => {
  it('generates a name matching the example style', async () => {
    const result = await nameSimilarTo('some data about sales', ['salesStats', 'revenueReport']);
    expect(result).toBe('freshName');
  });
});
