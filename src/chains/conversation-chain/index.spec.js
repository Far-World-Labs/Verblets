import { describe, it, expect, vi } from 'vitest';
import ConversationChain from './index.js';

let chatGPTMock;
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: (...args) => chatGPTMock(...args),
}));
chatGPTMock = vi.fn(async (_prompt) => 'ok');

const makeSpeak = () => vi.fn(async ({ speaker }) => `${speaker.id} speaks`);

describe('ConversationChain', () => {
  it('basic conversation with multiple speakers', async () => {
    const speakFn = makeSpeak();
    const speakers = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ];
    const chain = new ConversationChain('test topic', speakers, {
      rules: { shouldContinue: (r) => r < 2 },
      speakFn,
    });
    const messages = await chain.run();
    expect(messages).toHaveLength(4); // 2 speakers x 2 rounds
    expect(messages[0].id).toBe('a');
    expect(messages[1].id).toBe('b');
  });

  it('custom turnPolicy respected', async () => {
    const speakFn = makeSpeak();
    const speakers = [{ id: 'a' }, { id: 'b' }];
    const rules = {
      shouldContinue: (r) => r < 2,
      turnPolicy: (r) => (r % 2 === 0 ? ['a'] : ['b']),
    };
    const chain = new ConversationChain('test topic', speakers, { rules, speakFn });
    const messages = await chain.run();
    // order should alternate a then b
    expect(messages.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('bio text appears in prompts', async () => {
    const speakers = [{ id: 'expert', bio: 'expert bio' }];
    const chain = new ConversationChain('test topic', speakers, {
      rules: { shouldContinue: (r) => r < 1 },
    });
    chatGPTMock.mockClear();
    await chain.run();
    expect(chatGPTMock.mock.calls.some((c) => String(c[0]).includes('expert bio'))).toBe(true);
  });

  it('stops at 50 rounds maximum', async () => {
    const speakFn = vi.fn(async () => 'x');
    const chain = new ConversationChain('test topic', [{ id: 'a' }], {
      rules: { shouldContinue: () => true },
      speakFn,
    });
    const messages = await chain.run();
    expect(messages).toHaveLength(50); // 50 rounds max
  });

  it('throws on duplicate ids', () => {
    expect(() => new ConversationChain('test topic', [{ id: 'a' }, { id: 'a' }])).toThrow();
  });

  it('handles single speaker conversation', async () => {
    const speakFn = makeSpeak();
    const speakers = [{ id: 'a' }];
    const chain = new ConversationChain('test topic', speakers, {
      rules: { shouldContinue: (r) => r < 2 },
      speakFn,
    });
    const messages = await chain.run();
    expect(messages).toHaveLength(2); // 1 speaker x 2 rounds
    expect(messages[0].id).toBe('a');
    expect(messages[1].id).toBe('a');
  });

  it('bulk speak function is used when provided', async () => {
    const bulkSpeakFn = vi.fn(async ({ speakers }) => speakers.map((s) => `${s.id} bulk`));
    const speakers = [{ id: 'a' }, { id: 'b' }];
    const chain = new ConversationChain('test topic', speakers, {
      rules: { shouldContinue: (r) => r < 1 },
      bulkSpeakFn,
    });
    const messages = await chain.run();
    expect(bulkSpeakFn).toHaveBeenCalled();
    expect(messages.map((m) => m.comment)).toEqual(['a bulk', 'b bulk']);
  });

  it('handles empty turn policy gracefully', async () => {
    const speakFn = makeSpeak();
    const speakers = [{ id: 'a' }, { id: 'b' }];
    const rules = {
      shouldContinue: (r) => r < 1,
      turnPolicy: () => [], // Empty turn policy
    };
    const chain = new ConversationChain('test topic', speakers, { rules, speakFn });
    const messages = await chain.run();
    // Should fall back to all speakers
    expect(messages).toHaveLength(2);
    expect(messages.some((m) => m.id === 'a')).toBe(true);
    expect(messages.some((m) => m.id === 'b')).toBe(true);
  });

  it('turn policy can access conversation history', async () => {
    const speakFn = makeSpeak();
    const speakers = [{ id: 'a' }, { id: 'b' }];

    let historyReceived = null;
    const rules = {
      shouldContinue: (r) => r < 2,
      turnPolicy: (round, history) => {
        historyReceived = history;
        return round === 0 ? ['a'] : ['b'];
      },
    };

    const chain = new ConversationChain('test topic', speakers, { rules, speakFn });
    await chain.run();

    // History should have been passed to turn policy
    expect(historyReceived).not.toBeNull();
    expect(Array.isArray(historyReceived)).toBe(true);
  });
});
