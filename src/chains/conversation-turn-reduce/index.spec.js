import { describe, it, expect, vi } from 'vitest';
import conversationTurnReduce from './index.js';
import map from '../map/index.js';

vi.mock('../map/index.js', () => ({
  default: vi.fn(),
}));

describe('conversationTurnReduce', () => {
  it('generates multiline responses for multiple speakers', async () => {
    const speakers = [
      { id: 'alice', name: 'Alice', bio: 'software engineer' },
      { id: 'bob', name: 'Bob', bio: 'product manager' },
    ];

    // Mock map to return responses for both speakers
    map.mockResolvedValueOnce([
      `I think we should focus on user experience first.
    
The technical implementation can be refined later, but if we don't nail the UX, we'll lose users regardless of how elegant our code is.`,
      `Alice makes a great point about UX priority.
    
From a product perspective, I'd add that we also need to consider market timing. Even with perfect UX, if we're too late to market, competitors might have already established user habits.
    
What if we do a minimal viable UX first, then iterate?`,
    ]);

    const responses = await conversationTurnReduce({
      speakers,
      topic: 'product development strategy',
      history: [],
      rules: {},
      llm: { model: 'test' },
    });

    expect(responses).toHaveLength(2);
    expect(responses[0]).toContain('user experience first');
    expect(responses[0]).toContain('technical implementation');
    expect(responses[1]).toContain('Alice makes a great point');
    expect(responses[1]).toContain('minimal viable UX');

    // Verify map was called once with all speakers
    expect(map).toHaveBeenCalledTimes(1);
    expect(map).toHaveBeenCalledWith(
      speakers,
      expect.any(Function),
      expect.objectContaining({
        llm: { model: 'test' },
      })
    );
  });

  it('handles single speaker', async () => {
    const speakers = [{ id: 'alice', name: 'Alice' }];

    map.mockResolvedValueOnce(['This is my response to the topic.']);

    const responses = await conversationTurnReduce({
      speakers,
      topic: 'test topic',
      history: [],
      rules: {},
      llm: { model: 'test' },
    });

    expect(responses).toHaveLength(1);
    expect(responses[0]).toBe('This is my response to the topic.');
  });

  it('throws error when no speakers provided', async () => {
    await expect(
      conversationTurnReduce({
        speakers: [],
        topic: 'test topic',
        history: [],
        rules: {},
        llm: { model: 'test' },
      })
    ).rejects.toThrow('At least one speaker is required');
  });

  it('throws error when no topic provided', async () => {
    await expect(
      conversationTurnReduce({
        speakers: [{ id: 'alice', name: 'Alice' }],
        topic: '',
        history: [],
        rules: {},
        llm: { model: 'test' },
      })
    ).rejects.toThrow('Topic is required');
  });
});
