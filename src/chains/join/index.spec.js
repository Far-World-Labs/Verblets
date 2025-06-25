import { beforeEach, describe, expect, it, vi } from 'vitest';
import join from './index.js';
import chatGPT from '../../lib/chatgpt/index.js';

vi.mock('../../lib/chatgpt/index.js');

let call;

beforeEach(() => {
  vi.clearAllMocks();
  call = 0;
  chatGPT.mockImplementation((prompt) => {
    if (call === 0) {
      call += 1;
      return JSON.stringify({ labels: [0, 0, 1, 1] });
    }
    return prompt.toUpperCase();
  });
});

describe('join chain', () => {
  it('joins using join string', async () => {
    const result = await join(['a', 'b', 'c', 'd'], '-');
    expect(result).toStrictEqual(['a-b', 'c-d']);
    expect(chatGPT).toHaveBeenCalledTimes(1);
  });

  it('joins with custom prompt', async () => {
    const result = await join(['a', 'b', 'c', 'd'], ' ', async (parts) =>
      chatGPT(`combine ${parts.join(' ')}`)
    );
    expect(result).toStrictEqual(['COMBINE A B', 'COMBINE C D']);
    expect(chatGPT).toHaveBeenCalledTimes(3);
  });
});
