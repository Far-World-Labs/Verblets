import { vi, expect } from 'vitest';
import Conversation from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

let llmMock;
vi.mock('../../lib/llm/index.js', () => ({
  default: (...args) => llmMock(...args),
}));
llmMock = vi.fn(async () => 'ok');

let conversationTurnReduceMock;
vi.mock('../conversation-turn-reduce/index.js', () => ({
  default: vi.fn(async (args) => {
    conversationTurnReduceMock = args;
    return args.speakers.map((s) => `${s.id || s.name} speaks from reduce`);
  }),
}));

vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn(async (fn) => fn()) }));
vi.mock('../reduce/index.js', () => ({ default: vi.fn(async () => 'mocked reduce result') }));
vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(async () => ['mocked', 'batch', 'result']),
  ListStyle: { AUTO: 'auto', XML: 'xml', NEWLINE: 'newline' },
  determineStyle: vi.fn(() => 'auto'),
}));

const makeSpeak = () => vi.fn(async ({ speaker }) => `${speaker.id} speaks`);

// ─── Conversation (top-level behavior) ────────────────────────────────────

const examples = [
  {
    name: 'basic conversation with multiple speakers',
    inputs: {
      speakers: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      rules: { shouldContinue: (r) => r < 5 },
      makeSpeak: true,
    },
    check: ({ result: { messages } }) => {
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.some((m) => m.id === 'a')).toBe(true);
      expect(messages.some((m) => m.id === 'b')).toBe(true);
    },
  },
  {
    name: 'custom turnPolicy respected',
    inputs: {
      speakers: [{ id: 'a' }, { id: 'b' }],
      rules: {
        shouldContinue: (r) => r < 2,
        turnPolicy: (r) => (r % 2 === 0 ? ['a'] : ['b']),
      },
      makeSpeak: true,
    },
    check: ({ result: { messages } }) => expect(messages.map((m) => m.id)).toEqual(['a', 'b']),
  },
  {
    name: 'bio text appears in prompts',
    inputs: {
      speakers: [{ id: 'expert', bio: 'expert bio' }],
      rules: { shouldContinue: (r) => r < 1 },
      preMock: () => llmMock.mockClear(),
    },
    check: () => {
      expect(conversationTurnReduceMock).toBeDefined();
      expect(conversationTurnReduceMock.speakers).toBeDefined();
      expect(conversationTurnReduceMock.speakers[0].bio).toBe('expert bio');
    },
  },
  {
    name: 'handles single speaker conversation',
    inputs: {
      speakers: [{ id: 'a' }],
      rules: { shouldContinue: (r) => r < 2 },
      makeSpeak: true,
    },
    check: ({ result: { messages } }) => {
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.every((m) => m.id === 'a')).toBe(true);
    },
  },
  {
    name: 'bulk speak function is used when provided',
    inputs: {
      speakers: [{ id: 'a' }, { id: 'b' }],
      rules: { shouldContinue: (r) => r < 1 },
      makeBulkSpeak: () => vi.fn(async ({ speakers }) => speakers.map((s) => `${s.id} bulk`)),
    },
    check: ({ result: { messages, bulkSpeakFn } }) => {
      expect(bulkSpeakFn).toHaveBeenCalled();
      expect(messages.some((m) => m.comment.includes('bulk'))).toBe(true);
    },
  },
  {
    name: 'handles empty turn policy gracefully',
    inputs: {
      speakers: [{ id: 'a' }, { id: 'b' }],
      rules: { shouldContinue: (r) => r < 1, turnPolicy: () => [] },
      makeSpeak: true,
    },
    check: ({ result: { messages } }) => expect(messages.length).toBeGreaterThan(0),
  },
  {
    name: 'turn policy can access conversation history',
    inputs: {
      speakers: [{ id: 'a' }, { id: 'b' }],
      makeRules: () => {
        const captured = {};
        return {
          rules: {
            shouldContinue: (r) => r < 2,
            turnPolicy: (round, history) => {
              captured.history = history;
              return round === 0 ? ['a'] : ['b'];
            },
          },
          captured,
        };
      },
      makeSpeak: true,
    },
    check: ({ result: { captured } }) => {
      expect(captured.history).toBeDefined();
      expect(Array.isArray(captured.history)).toBe(true);
    },
  },
  {
    name: 'uses default 3 rounds when no shouldContinue provided',
    inputs: { speakers: [{ id: 'a' }], makeSpeak: true },
    check: ({ result: { messages } }) => {
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.length).toBeLessThanOrEqual(15);
    },
  },
  {
    name: 'uses default turn policy when none provided',
    inputs: {
      speakers: [{ id: 'a' }, { id: 'b' }],
      rules: { shouldContinue: (r) => r < 1 },
      makeSpeak: true,
    },
    check: ({ result: { messages } }) => {
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.length).toBeLessThanOrEqual(5);
    },
  },
];

runTable({
  describe: 'Conversation',
  examples,
  process: async ({ speakers, rules, makeSpeak: useSpeak, makeBulkSpeak, makeRules, preMock }) => {
    if (preMock) preMock();
    const speakFn = useSpeak ? makeSpeak() : undefined;
    const bulkSpeakFn = makeBulkSpeak ? makeBulkSpeak() : undefined;
    let actualRules = rules;
    let captured;
    if (makeRules) {
      const r = makeRules();
      actualRules = r.rules;
      captured = r.captured;
    }
    const chain = new Conversation('test topic', speakers, {
      ...(actualRules ? { rules: actualRules } : {}),
      ...(speakFn ? { speakFn } : {}),
      ...(bulkSpeakFn ? { bulkSpeakFn } : {}),
    });
    const messages = await chain.run();
    return { messages, chain, captured, bulkSpeakFn };
  },
});

// ─── speaker memory ───────────────────────────────────────────────────────

const memoryExamples = [
  {
    name: 'accumulates per-speaker memory across rounds',
    inputs: {
      speakers: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      rules: { shouldContinue: (r) => r < 3, turnPolicy: () => ['a', 'b'] },
      useSpeak: true,
    },
    check: ({ result: { chain } }) => {
      expect(chain.speakerMemory.has('a')).toBe(true);
      expect(chain.speakerMemory.has('b')).toBe(true);
      expect(chain.speakerMemory.get('a')).toHaveLength(3);
      expect(chain.speakerMemory.get('b')).toHaveLength(3);
      for (const m of chain.speakerMemory.get('a')) {
        expect(m).toMatchObject({ id: 'a', comment: 'a speaks' });
      }
    },
  },
  {
    name: 'passes speakerMemory to bulkSpeakFn (conversationTurnReduce)',
    inputs: {
      speakers: [{ id: 'x', name: 'X' }],
      rules: { shouldContinue: (r) => r < 2, turnPolicy: () => ['x'] },
    },
    check: () => {
      expect(conversationTurnReduceMock.speakerMemory).toBeDefined();
      expect(conversationTurnReduceMock.speakerMemory).toBeInstanceOf(Map);
    },
  },
  {
    name: 'passes speakerMemory snapshot to speakFn',
    inputs: {
      speakers: [{ id: 'a', name: 'A' }],
      rules: { shouldContinue: (r) => r < 2, turnPolicy: () => ['a'] },
      makeSpeak: () => {
        const captured = {};
        const fn = vi.fn(async ({ speaker, speakerMemory }) => {
          captured.memory = speakerMemory;
          return `${speaker.id} speaks`;
        });
        return { fn, captured };
      },
    },
    check: ({ result: { captured } }) => {
      expect(captured.memory).toBeInstanceOf(Map);
      expect(captured.memory.get('a')).toHaveLength(1);
      expect(captured.memory.get('a')[0].comment).toBe('a speaks');
    },
  },
  {
    name: 'provides isolated memory snapshots per round',
    inputs: {
      speakers: [{ id: 'a', name: 'A' }],
      rules: { shouldContinue: (r) => r < 3, turnPolicy: () => ['a'] },
      makeBulkSpeak: () => {
        const snapshots = [];
        const fn = vi.fn(async ({ speakers, speakerMemory }) => {
          snapshots.push(new Map([...speakerMemory].map(([k, v]) => [k, v.slice()])));
          return speakers.map((s) => `${s.id} round`);
        });
        return { fn, snapshots };
      },
    },
    check: ({ result: { snapshots } }) => {
      expect(snapshots[0].size).toBe(0);
      expect(snapshots[1].get('a')).toHaveLength(1);
      expect(snapshots[2].get('a')).toHaveLength(2);
    },
  },
  {
    name: 'only tracks speakers who have spoken',
    inputs: {
      speakers: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      rules: { shouldContinue: (r) => r < 2, turnPolicy: () => ['a'] },
      useSpeak: true,
    },
    check: ({ result: { chain } }) => {
      expect(chain.speakerMemory.has('a')).toBe(true);
      expect(chain.speakerMemory.has('b')).toBe(false);
    },
  },
];

runTable({
  describe: 'Conversation — speaker memory',
  examples: memoryExamples,
  process: async ({ speakers, rules, useSpeak, makeSpeak: makeSpeakFn, makeBulkSpeak }) => {
    let speakFn;
    let bulkSpeakFn;
    let captured;
    let snapshots;
    if (useSpeak) speakFn = makeSpeak();
    else if (makeSpeakFn) {
      const r = makeSpeakFn();
      speakFn = r.fn;
      captured = r.captured;
    }
    if (makeBulkSpeak) {
      const r = makeBulkSpeak();
      bulkSpeakFn = r.fn;
      snapshots = r.snapshots;
    }
    const chain = new Conversation('test topic', speakers, {
      rules,
      ...(speakFn ? { speakFn } : {}),
      ...(bulkSpeakFn ? { bulkSpeakFn } : {}),
    });
    await chain.run();
    return { chain, captured, snapshots };
  },
});
