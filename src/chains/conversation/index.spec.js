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

runTable({
  describe: 'Conversation',
  examples: [
    {
      name: 'basic conversation with multiple speakers',
      inputs: {
        speakers: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ],
        rules: { shouldContinue: (r) => r < 5 },
        useSpeak: true,
      },
      want: { messageCountAtLeast: 1, someMessageIds: ['a', 'b'] },
    },
    {
      name: 'custom turnPolicy respected',
      inputs: {
        speakers: [{ id: 'a' }, { id: 'b' }],
        rules: {
          shouldContinue: (r) => r < 2,
          turnPolicy: (r) => (r % 2 === 0 ? ['a'] : ['b']),
        },
        useSpeak: true,
      },
      want: { messageIds: ['a', 'b'] },
    },
    {
      name: 'bio text appears in prompts',
      inputs: {
        speakers: [{ id: 'expert', bio: 'expert bio' }],
        rules: { shouldContinue: (r) => r < 1 },
        clearLlm: true,
      },
      want: { turnReduceBio: 'expert bio' },
    },
    {
      name: 'handles single speaker conversation',
      inputs: {
        speakers: [{ id: 'a' }],
        rules: { shouldContinue: (r) => r < 2 },
        useSpeak: true,
      },
      want: { messageCountAtLeast: 1, allMessageId: 'a' },
    },
    {
      name: 'bulk speak function is used when provided',
      inputs: {
        speakers: [{ id: 'a' }, { id: 'b' }],
        rules: { shouldContinue: (r) => r < 1 },
        makeBulkSpeak: () => vi.fn(async ({ speakers }) => speakers.map((s) => `${s.id} bulk`)),
      },
      want: { bulkSpeakCalled: true, someMessageContains: 'bulk' },
    },
    {
      name: 'handles empty turn policy gracefully',
      inputs: {
        speakers: [{ id: 'a' }, { id: 'b' }],
        rules: { shouldContinue: (r) => r < 1, turnPolicy: () => [] },
        useSpeak: true,
      },
      want: { messageCountAtLeast: 1 },
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
        useSpeak: true,
      },
      want: { historyArray: true },
    },
    {
      name: 'uses default 3 rounds when no shouldContinue provided',
      inputs: { speakers: [{ id: 'a' }], useSpeak: true },
      want: { messageCountAtLeast: 1, messageCountAtMost: 15 },
    },
    {
      name: 'uses default turn policy when none provided',
      inputs: {
        speakers: [{ id: 'a' }, { id: 'b' }],
        rules: { shouldContinue: (r) => r < 1 },
        useSpeak: true,
      },
      want: { messageCountAtLeast: 1, messageCountAtMost: 5 },
    },
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
      want: {
        speakerMemoryHas: ['a', 'b'],
        speakerMemoryLengths: { a: 3, b: 3 },
        speakerMemoryShape: { a: { id: 'a', comment: 'a speaks' } },
      },
    },
    {
      name: 'passes speakerMemory to bulkSpeakFn (conversationTurnReduce)',
      inputs: {
        speakers: [{ id: 'x', name: 'X' }],
        rules: { shouldContinue: (r) => r < 2, turnPolicy: () => ['x'] },
      },
      want: { turnReduceMemoryIsMap: true },
    },
    {
      name: 'passes speakerMemory snapshot to speakFn',
      inputs: {
        speakers: [{ id: 'a', name: 'A' }],
        rules: { shouldContinue: (r) => r < 2, turnPolicy: () => ['a'] },
        makeSpeakFn: () => {
          const captured = {};
          const fn = vi.fn(async ({ speaker, speakerMemory }) => {
            captured.memory = speakerMemory;
            return `${speaker.id} speaks`;
          });
          return { fn, captured };
        },
      },
      want: { capturedMemoryGet: { a: { length: 1, firstComment: 'a speaks' } } },
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
      want: { snapshotSizes: [0, 1, 2] },
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
      want: { speakerMemoryHas: ['a'], speakerMemoryHasNot: ['b'] },
    },
  ],
  process: async ({ inputs }) => {
    if (inputs.clearLlm) llmMock.mockClear();
    let speakFn;
    let bulkSpeakFn;
    let speakCaptured;
    let snapshots;
    if (inputs.useSpeak) speakFn = makeSpeak();
    else if (inputs.makeSpeakFn) {
      const r = inputs.makeSpeakFn();
      speakFn = r.fn;
      speakCaptured = r.captured;
    }
    if (inputs.makeBulkSpeak) {
      const r = inputs.makeBulkSpeak();
      if (typeof r === 'function') bulkSpeakFn = r;
      else {
        bulkSpeakFn = r.fn;
        snapshots = r.snapshots;
      }
    }
    let actualRules = inputs.rules;
    let rulesCaptured;
    if (inputs.makeRules) {
      const r = inputs.makeRules();
      actualRules = r.rules;
      rulesCaptured = r.captured;
    }
    const chain = new Conversation('test topic', inputs.speakers, {
      ...(actualRules ? { rules: actualRules } : {}),
      ...(speakFn ? { speakFn } : {}),
      ...(bulkSpeakFn ? { bulkSpeakFn } : {}),
    });
    const messages = await chain.run();
    return { messages, chain, speakCaptured, rulesCaptured, snapshots, bulkSpeakFn };
  },
  expects: ({ result, want }) => {
    const { messages, chain, speakCaptured, rulesCaptured, snapshots, bulkSpeakFn } = result;
    if ('messageCountAtLeast' in want) {
      expect(messages.length).toBeGreaterThanOrEqual(want.messageCountAtLeast);
    }
    if ('messageCountAtMost' in want) {
      expect(messages.length).toBeLessThanOrEqual(want.messageCountAtMost);
    }
    if (want.someMessageIds) {
      for (const id of want.someMessageIds) {
        expect(messages.some((m) => m.id === id)).toBe(true);
      }
    }
    if (want.messageIds) {
      expect(messages.map((m) => m.id)).toEqual(want.messageIds);
    }
    if (want.allMessageId) {
      expect(messages.every((m) => m.id === want.allMessageId)).toBe(true);
    }
    if (want.turnReduceBio) {
      expect(conversationTurnReduceMock).toBeDefined();
      expect(conversationTurnReduceMock.speakers[0].bio).toBe(want.turnReduceBio);
    }
    if (want.bulkSpeakCalled) expect(bulkSpeakFn).toHaveBeenCalled();
    if (want.someMessageContains) {
      expect(messages.some((m) => m.comment.includes(want.someMessageContains))).toBe(true);
    }
    if (want.historyArray) {
      expect(rulesCaptured.history).toBeDefined();
      expect(Array.isArray(rulesCaptured.history)).toBe(true);
    }
    if (want.speakerMemoryHas) {
      for (const id of want.speakerMemoryHas) {
        expect(chain.speakerMemory.has(id)).toBe(true);
      }
    }
    if (want.speakerMemoryHasNot) {
      for (const id of want.speakerMemoryHasNot) {
        expect(chain.speakerMemory.has(id)).toBe(false);
      }
    }
    if (want.speakerMemoryLengths) {
      for (const [id, len] of Object.entries(want.speakerMemoryLengths)) {
        expect(chain.speakerMemory.get(id)).toHaveLength(len);
      }
    }
    if (want.speakerMemoryShape) {
      for (const [id, shape] of Object.entries(want.speakerMemoryShape)) {
        for (const m of chain.speakerMemory.get(id)) {
          expect(m).toMatchObject(shape);
        }
      }
    }
    if (want.turnReduceMemoryIsMap) {
      expect(conversationTurnReduceMock.speakerMemory).toBeInstanceOf(Map);
    }
    if (want.capturedMemoryGet) {
      for (const [id, shape] of Object.entries(want.capturedMemoryGet)) {
        const memory = speakCaptured.memory;
        expect(memory).toBeInstanceOf(Map);
        const entries = memory.get(id);
        expect(entries).toHaveLength(shape.length);
        if (shape.firstComment) expect(entries[0].comment).toBe(shape.firstComment);
      }
    }
    if (want.snapshotSizes) {
      want.snapshotSizes.forEach((n, i) => {
        if (n === 0) expect(snapshots[i].size).toBe(0);
        else expect(snapshots[i].get('a')).toHaveLength(n);
      });
    }
  },
});
