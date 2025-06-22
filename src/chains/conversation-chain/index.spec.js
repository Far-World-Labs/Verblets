import { describe, it, expect, vi } from 'vitest';
import ConversationChain from './index.js';

let chatGPTMock;
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: (...args) => chatGPTMock(...args),
}));
chatGPTMock = vi.fn(async (_prompt) => 'ok');

const makeSpeak = () => vi.fn(async ({ speaker }) => `${speaker.id} speaks`);
const makeFacil = () => vi.fn(async () => 'facilitator speaks');
const makeSummary = () => vi.fn(async ({ speaker }) => `${speaker.id} summary`);

describe('ConversationChain', () => {
  it('happy path with facilitator and summaries', async () => {
    const speakFn = makeSpeak();
    const facilitatorFn = makeFacil();
    const summaryFn = makeSummary();
    const speakers = [
      { id: 'f', role: 'facilitator', name: 'Fac' },
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ];
    const chain = new ConversationChain('t', speakers, {
      rules: { shouldContinue: (r) => r < 2 },
      speakFn,
      facilitatorFn,
      summaryFn,
    });
    const messages = await chain.run();
    expect(messages).toHaveLength(8);
    expect(messages[0].name).toBe('Fac');
    expect(messages[messages.length - 1].id).toBe('b');
  });

  it('custom turnPolicy respected', async () => {
    const speakFn = makeSpeak();
    const speakers = [{ id: 'a' }, { id: 'b' }];
    const rules = {
      shouldContinue: (r) => r < 2,
      facilitatorTurns: false,
      turnPolicy: (r) => (r % 2 === 0 ? ['a'] : ['b']),
    };
    const chain = new ConversationChain('t', speakers, { rules, speakFn });
    const messages = await chain.run();
    // order should alternate a then b, summaries follow last round order
    expect(messages.map((m) => m.id)).toEqual(['a', 'b', 'b', 'a']);
  });

  it('bio text appears in prompts', async () => {
    const speakers = [
      { id: 'f', role: 'facilitator' },
      { id: 'expert', bio: 'expert bio' },
    ];
    const chain = new ConversationChain('t', speakers, { rules: { shouldContinue: (r) => r < 1 } });
    chatGPTMock.mockClear();
    await chain.run();
    expect(chatGPTMock.mock.calls.some((c) => String(c[0]).includes('expert bio'))).toBe(true);
  });

  it('untilSettle stops at 50 rounds', async () => {
    const speakFn = vi.fn(async () => 'x');
    const chain = new ConversationChain('t', [{ id: 'a' }], {
      rules: { shouldContinue: () => true, facilitatorTurns: false },
      speakFn,
    });
    const messages = await chain.run();
    // 50 rounds + summary
    expect(messages).toHaveLength(51);
  });

  it('throws on duplicate ids', () => {
    expect(() => new ConversationChain('t', [{ id: 'a' }, { id: 'a' }])).toThrow();
  });

  it('no facilitator still runs summaries', async () => {
    const speakFn = makeSpeak();
    const speakers = [{ id: 'a' }, { id: 'b' }];
    const chain = new ConversationChain('t', speakers, {
      rules: { shouldContinue: (r) => r < 1 },
      speakFn,
    });
    const messages = await chain.run();
    expect(messages).toHaveLength(4);
    expect(messages[0].id).toBe('a');
  });

  it('bulk functions are used when provided', async () => {
    const bulkSpeakFn = vi.fn(async ({ speakers }) => speakers.map((s) => `${s.id} bulk`));
    const bulkSummaryFn = vi.fn(async ({ speakers }) => speakers.map((s) => `${s.id} end`));
    const facilitatorFn = makeFacil();
    const participants = [{ id: 'f', role: 'facilitator' }, { id: 'a' }, { id: 'b' }];
    const chain = new ConversationChain('t', participants, {
      rules: { shouldContinue: (r) => r < 1 },
      facilitatorFn,
      bulkSpeakFn,
      bulkSummaryFn,
    });
    const messages = await chain.run();
    expect(bulkSpeakFn).toHaveBeenCalled();
    expect(bulkSummaryFn).toHaveBeenCalled();
    expect(messages.map((m) => m.comment)).toEqual([
      'facilitator speaks',
      'a bulk',
      'b bulk',
      'a end',
      'b end',
    ]);
  });
});
