import { describe, it, expect, vi } from 'vitest';
import conversationTurnReduce from './index.js';
import map from '../map/index.js';

vi.mock('../map/index.js', () => ({
  default: vi.fn(),
}));

beforeEach(() => {
  map.mockClear();
});

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
      llm: 'test',
    });

    expect(responses).toHaveLength(2);
    expect(responses[0]).toContain('user experience first');
    expect(responses[0]).toContain('technical implementation');
    expect(responses[1]).toContain('Alice makes a great point');
    expect(responses[1]).toContain('minimal viable UX');

    // Verify map was called once with speaker descriptions
    expect(map).toHaveBeenCalledTimes(1);
    expect(map).toHaveBeenCalledWith(
      ['Alice\nBio: software engineer', 'Bob\nBio: product manager'],
      expect.any(String),
      expect.objectContaining({
        llm: 'test',
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
      llm: 'test',
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
        llm: 'test',
      })
    ).rejects.toThrow(/speakers must be a non-empty array/);
  });

  it('throws error when no topic provided', async () => {
    await expect(
      conversationTurnReduce({
        speakers: [{ id: 'alice', name: 'Alice' }],
        topic: '',
        history: [],
        rules: {},
        llm: 'test',
      })
    ).rejects.toThrow(/topic is required/);
  });

  describe('speaker memory integration', () => {
    it('includes prior statements in speaker descriptions', async () => {
      const speakers = [
        { id: 'alice', name: 'Alice', bio: 'engineer' },
        { id: 'bob', name: 'Bob' },
      ];
      const speakerMemory = new Map([
        [
          'alice',
          [
            { id: 'alice', name: 'Alice', comment: 'I think we need more tests', time: '10:00' },
            { id: 'alice', name: 'Alice', comment: 'Coverage is too low', time: '10:05' },
          ],
        ],
      ]);

      map.mockResolvedValueOnce(['Alice response', 'Bob response']);

      await conversationTurnReduce({
        speakers,
        topic: 'code quality',
        history: [],
        speakerMemory,
        rules: {},
        llm: 'test',
      });

      const descriptions = map.mock.calls[0][0];
      // Alice's description should include her prior statements
      expect(descriptions[0]).toContain('Alice');
      expect(descriptions[0]).toContain('Bio: engineer');
      expect(descriptions[0]).toContain('Prior statements:');
      expect(descriptions[0]).toContain('[10:00] I think we need more tests');
      expect(descriptions[0]).toContain('[10:05] Coverage is too low');
      // Bob has no memory — no prior statements section
      expect(descriptions[1]).toBe('Bob');
      expect(descriptions[1]).not.toContain('Prior statements:');
    });

    it('omits prior statements section when memory is empty', async () => {
      const speakers = [{ id: 'alice', name: 'Alice' }];

      map.mockResolvedValueOnce(['Alice response']);

      await conversationTurnReduce({
        speakers,
        topic: 'test topic',
        history: [],
        speakerMemory: new Map(),
        rules: {},
        llm: 'test',
      });

      const descriptions = map.mock.calls[0][0];
      expect(descriptions[0]).toBe('Alice');
      expect(descriptions[0]).not.toContain('Prior statements:');
    });

    it('works when speakerMemory is not provided (defaults to empty)', async () => {
      const speakers = [{ id: 'alice', name: 'Alice' }];

      map.mockResolvedValueOnce(['Alice response']);

      await conversationTurnReduce({
        speakers,
        topic: 'test topic',
        history: [],
        rules: {},
        llm: 'test',
      });

      const descriptions = map.mock.calls[0][0];
      expect(descriptions[0]).toBe('Alice');
      expect(descriptions[0]).not.toContain('Prior statements:');
    });

    it('includes consistency instruction when speakers have memory', async () => {
      const speakers = [{ id: 'alice', name: 'Alice' }];
      const speakerMemory = new Map([
        ['alice', [{ id: 'alice', name: 'Alice', comment: 'Prior point', time: '09:00' }]],
      ]);

      map.mockResolvedValueOnce(['Alice response']);

      await conversationTurnReduce({
        speakers,
        topic: 'debate',
        history: [],
        speakerMemory,
        rules: {},
        llm: 'test',
      });

      const instructions = map.mock.calls[0][1];
      expect(instructions).toContain('maintain consistency');
      expect(instructions).toContain('prior statements');
    });
  });
});
