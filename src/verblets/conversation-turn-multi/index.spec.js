import { describe, it, expect, vi } from 'vitest';
import conversationTurnMulti from './index.js';

// Mock chatGPT to prevent actual API calls
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async (_prompt) => '1. First speaker response\n2. Second speaker response'),
}));

describe('conversationTurnMulti', () => {
  it('generates responses for multiple speakers', async () => {
    const speakers = [
      { id: 'a', name: 'Alice', bio: 'software engineer' },
      { id: 'b', name: 'Bob', bio: 'product manager' },
    ];

    const responses = await conversationTurnMulti({
      speakers,
      topic: 'improving user experience',
      history: [],
      rules: {},
    });

    expect(Array.isArray(responses)).toBe(true);
    expect(responses.length).toBe(2);
    expect(typeof responses[0]).toBe('string');
    expect(typeof responses[1]).toBe('string');
    expect(responses[0].length).toBeGreaterThan(0);
    expect(responses[1].length).toBeGreaterThan(0);
  });

  it('throws error when speakers are missing', async () => {
    await expect(
      conversationTurnMulti({
        speakers: [],
        topic: 'test topic',
      })
    ).rejects.toThrow('At least one speaker is required');
  });

  it('throws error when topic is missing', async () => {
    await expect(
      conversationTurnMulti({
        speakers: [{ id: 'a' }],
        topic: '',
      })
    ).rejects.toThrow('Topic is required');
  });

  it('handles conversation history', async () => {
    const speakers = [{ id: 'a', name: 'Alice' }];
    const history = [{ id: 'b', name: 'Bob', comment: 'What do you think?', time: '10:00' }];

    const responses = await conversationTurnMulti({
      speakers,
      topic: 'test topic',
      history,
      rules: {},
    });

    expect(responses).toHaveLength(1);
    expect(typeof responses[0]).toBe('string');
  });
});
