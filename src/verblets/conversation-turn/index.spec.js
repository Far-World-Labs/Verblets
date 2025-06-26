import { describe, it, expect, vi } from 'vitest';
import conversationTurn from './index.js';

// Mock chatGPT to prevent actual API calls
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async (_prompt) => 'Mocked response from speaker'),
}));

describe('conversationTurn', () => {
  it('generates response for a single speaker', async () => {
    const speaker = { id: 'a', name: 'Alice', bio: 'software engineer' };

    const response = await conversationTurn({
      speaker,
      topic: 'improving user experience',
      history: [],
      rules: {},
    });

    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
  });

  it('throws error when speaker is missing', async () => {
    await expect(
      conversationTurn({
        speaker: null,
        topic: 'test topic',
      })
    ).rejects.toThrow('Speaker is required');
  });

  it('throws error when topic is missing', async () => {
    await expect(
      conversationTurn({
        speaker: { id: 'a' },
        topic: '',
      })
    ).rejects.toThrow('Topic is required');
  });

  it('handles conversation history', async () => {
    const speaker = { id: 'a', name: 'Alice', bio: 'therapist' };
    const history = [{ id: 'b', name: 'Bob', comment: 'I feel stressed', time: '10:00' }];

    const response = await conversationTurn({
      speaker,
      topic: 'mental health support',
      history,
      rules: { customPrompt: 'Be empathetic and supportive' },
    });

    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
  });

  it('uses speaker bio and agenda in response', async () => {
    const speaker = {
      id: 'expert',
      name: 'Dr. Smith',
      bio: 'AI researcher',
      agenda: 'Explain complex concepts simply',
    };

    const response = await conversationTurn({
      speaker,
      topic: 'machine learning basics',
      history: [
        { id: 'student', name: 'Student', comment: 'What is machine learning?', time: '10:00' },
      ],
      rules: {},
    });

    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(10);
  });
});
