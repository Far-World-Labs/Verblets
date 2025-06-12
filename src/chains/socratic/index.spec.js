import { describe, expect, it, vi } from 'vitest';
import { socratic } from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => {
  let call = 0;
  return {
    default: vi.fn(() => {
      call += 1;
      return call % 2 === 1 ? `Q${call}` : `A${call}`;
    }),
  };
});

describe('socratic chain', () => {
  it('runs dialogue for specified depth', async () => {
    const chain = socratic('topic');
    const result = await chain.run(2);
    expect(result).toHaveLength(2);
    result.forEach((turn) => {
      expect(turn).toHaveProperty('question');
      expect(turn).toHaveProperty('answer');
    });
  });
});
