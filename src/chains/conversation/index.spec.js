import { describe, it, expect, vi } from 'vitest';
import Conversation from './index.js';

let chatGPTMock;
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: (...args) => chatGPTMock(...args),
}));
chatGPTMock = vi.fn(async (_prompt) => 'ok');

// Mock the conversationTurnReduce to avoid slow reduce chain calls
let conversationTurnReduceMock;
vi.mock('../conversation-turn-reduce/index.js', () => ({
  default: vi.fn(async (args) => {
    conversationTurnReduceMock = args;
    return args.speakers.map((s) => `${s.id || s.name} speaks from reduce`);
  }),
}));

// Mock retry to avoid any potential delays
vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => await fn()),
}));

// Mock reduce chain to prevent cascading calls
vi.mock('../reduce/index.js', () => ({
  default: vi.fn(async () => 'mocked reduce result'),
}));

// Mock list-batch to prevent LLM calls
vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(async () => ['mocked', 'batch', 'result']),
  ListStyle: { AUTO: 'auto', XML: 'xml', NEWLINE: 'newline' },
  determineStyle: vi.fn(() => 'auto'),
}));

const makeSpeak = () => vi.fn(async ({ speaker }) => `${speaker.id} speaks`);

describe('Conversation', () => {
  it('basic conversation with multiple speakers', async () => {
    const speakFn = makeSpeak();
    const speakers = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ];
    const chain = new Conversation('test topic', speakers, {
      rules: { shouldContinue: (r) => r < 5 },
      speakFn,
    });
    const messages = await chain.run();
    expect(messages.length).toBeGreaterThan(0); // At least some messages
    expect(messages.some((m) => m.id === 'a')).toBe(true);
    expect(messages.some((m) => m.id === 'b')).toBe(true);
  });

  it('custom turnPolicy respected', async () => {
    const speakFn = makeSpeak();
    const speakers = [{ id: 'a' }, { id: 'b' }];
    const rules = {
      shouldContinue: (r) => r < 2,
      turnPolicy: (r) => (r % 2 === 0 ? ['a'] : ['b']),
    };
    const chain = new Conversation('test topic', speakers, { rules, speakFn });
    const messages = await chain.run();
    // order should alternate a then b
    expect(messages.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('bio text appears in prompts', async () => {
    const speakers = [{ id: 'expert', bio: 'expert bio' }];
    const chain = new Conversation('test topic', speakers, {
      rules: { shouldContinue: (r) => r < 1 },
    });
    chatGPTMock.mockClear();
    await chain.run();
    // Check that the bio is passed to conversationTurnReduce
    expect(conversationTurnReduceMock).toBeDefined();
    expect(conversationTurnReduceMock.speakers).toBeDefined();
    expect(conversationTurnReduceMock.speakers[0].bio).toBe('expert bio');
  });

  it('handles single speaker conversation', async () => {
    const speakFn = makeSpeak();
    const speakers = [{ id: 'a' }];
    const chain = new Conversation('test topic', speakers, {
      rules: { shouldContinue: (r) => r < 2 },
      speakFn,
    });
    const messages = await chain.run();
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.every((m) => m.id === 'a')).toBe(true);
  });

  it('bulk speak function is used when provided', async () => {
    const bulkSpeakFn = vi.fn(async ({ speakers }) => speakers.map((s) => `${s.id} bulk`));
    const speakers = [{ id: 'a' }, { id: 'b' }];
    const chain = new Conversation('test topic', speakers, {
      rules: { shouldContinue: (r) => r < 1 },
      bulkSpeakFn,
    });
    const messages = await chain.run();
    expect(bulkSpeakFn).toHaveBeenCalled();
    expect(messages.some((m) => m.comment.includes('bulk'))).toBe(true);
  });

  it('handles empty turn policy gracefully', async () => {
    const speakFn = makeSpeak();
    const speakers = [{ id: 'a' }, { id: 'b' }];
    const rules = {
      shouldContinue: (r) => r < 1,
      turnPolicy: () => [], // Empty turn policy
    };
    const chain = new Conversation('test topic', speakers, { rules, speakFn });
    const messages = await chain.run();
    // Should fall back to default sampling policy
    expect(messages.length).toBeGreaterThan(0);
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

    const chain = new Conversation('test topic', speakers, { rules, speakFn });
    await chain.run();

    // History should have been passed to turn policy
    expect(historyReceived).not.toBeNull();
    expect(Array.isArray(historyReceived)).toBe(true);
  });

  it('uses default 3 rounds when no shouldContinue provided', async () => {
    const speakFn = makeSpeak();
    const speakers = [{ id: 'a' }];
    const chain = new Conversation('test topic', speakers, { speakFn });
    const messages = await chain.run();

    // Should run for 3 rounds by default
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.length).toBeLessThanOrEqual(15); // 3 rounds * max 5 speakers
  });

  it('uses default turn policy when none provided', async () => {
    const speakFn = makeSpeak();
    const speakers = [{ id: 'a' }, { id: 'b' }];
    const chain = new Conversation('test topic', speakers, {
      rules: { shouldContinue: (r) => r < 1 },
      speakFn,
    });
    const messages = await chain.run();

    // Should use default probabilistic sampling
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.length).toBeLessThanOrEqual(5); // Max 5 speakers per round
  });
});
