import { beforeEach, describe, expect, it, vi } from 'vitest';
import score from './index.js';
import chatGPT from '../../lib/chatgpt/index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('score chain', () => {
  it('scores items using two passes', async () => {
    chatGPT
      .mockResolvedValueOnce('[1,2,3]')
      .mockResolvedValueOnce('[1,2,3,4,5,6,7,8,9]')
      .mockResolvedValueOnce('[1,2,3]');
    const { scores, reference } = await score(['a', 'bb', 'ccc'], 'length');
    expect(scores).toStrictEqual([1, 2, 3]);
    expect(reference.length).toBeGreaterThan(0);
    expect(chatGPT).toHaveBeenCalled();
  });

  it('uses provided examples', async () => {
    chatGPT.mockResolvedValueOnce('[1]').mockResolvedValueOnce('[1]');
    const { scores } = await score(['x'], 'length', { examples: [{ item: 'y', score: 2 }] });
    expect(scores[0]).toBe(1);
  });
});
