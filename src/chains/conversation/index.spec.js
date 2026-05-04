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

// One block — every row's `expects` runs the same vocabulary, lit up by
// control flags on inputs (wantMessageCount, wantMessageIds,
// wantTurnReduceBio, wantSpeakerMemoryHas, etc.).
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
        wantMessageCountAtLeast: 1,
        wantSomeMessageIds: ['a', 'b'],
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
        useSpeak: true,
        wantMessageIds: ['a', 'b'],
      },
    },
    {
      name: 'bio text appears in prompts',
      inputs: {
        speakers: [{ id: 'expert', bio: 'expert bio' }],
        rules: { shouldContinue: (r) => r < 1 },
        mock: () => llmMock.mockClear(),
        wantTurnReduceBio: 'expert bio',
      },
    },
    {
      name: 'handles single speaker conversation',
      inputs: {
        speakers: [{ id: 'a' }],
        rules: { shouldContinue: (r) => r < 2 },
        useSpeak: true,
        wantMessageCountAtLeast: 1,
        wantAllMessageId: 'a',
      },
    },
    {
      name: 'bulk speak function is used when provided',
      inputs: {
        speakers: [{ id: 'a' }, { id: 'b' }],
        rules: { shouldContinue: (r) => r < 1 },
        makeBulkSpeak: () => vi.fn(async ({ speakers }) => speakers.map((s) => `${s.id} bulk`)),
        wantBulkSpeakCalled: true,
        wantSomeMessageContains: 'bulk',
      },
    },
    {
      name: 'handles empty turn policy gracefully',
      inputs: {
        speakers: [{ id: 'a' }, { id: 'b' }],
        rules: { shouldContinue: (r) => r < 1, turnPolicy: () => [] },
        useSpeak: true,
        wantMessageCountAtLeast: 1,
      },
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
        wantHistoryArray: true,
      },
    },
    {
      name: 'uses default 3 rounds when no shouldContinue provided',
      inputs: {
        speakers: [{ id: 'a' }],
        useSpeak: true,
        wantMessageCountAtLeast: 1,
        wantMessageCountAtMost: 15,
      },
    },
    {
      name: 'uses default turn policy when none provided',
      inputs: {
        speakers: [{ id: 'a' }, { id: 'b' }],
        rules: { shouldContinue: (r) => r < 1 },
        useSpeak: true,
        wantMessageCountAtLeast: 1,
        wantMessageCountAtMost: 5,
      },
    },
    // Speaker memory:
    {
      name: 'accumulates per-speaker memory across rounds',
      inputs: {
        speakers: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ],
        rules: { shouldContinue: (r) => r < 3, turnPolicy: () => ['a', 'b'] },
        useSpeak: true,
        wantSpeakerMemoryHas: ['a', 'b'],
        wantSpeakerMemoryLengths: { a: 3, b: 3 },
        wantSpeakerMemoryShape: { a: { id: 'a', comment: 'a speaks' } },
      },
    },
    {
      name: 'passes speakerMemory to bulkSpeakFn (conversationTurnReduce)',
      inputs: {
        speakers: [{ id: 'x', name: 'X' }],
        rules: { shouldContinue: (r) => r < 2, turnPolicy: () => ['x'] },
        wantTurnReduceMemoryIsMap: true,
      },
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
        wantCapturedMemoryGet: { a: { length: 1, firstComment: 'a speaks' } },
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
        wantSnapshotSizes: [0, 1, 2],
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
        wantSpeakerMemoryHas: ['a'],
        wantSpeakerMemoryHasNot: ['b'],
      },
    },
  ],
  process: async ({ speakers, rules, useSpeak, makeSpeakFn, makeBulkSpeak, makeRules, mock }) => {
    if (mock) mock();
    let speakFn;
    let bulkSpeakFn;
    let speakCaptured;
    let snapshots;
    if (useSpeak) speakFn = makeSpeak();
    else if (makeSpeakFn) {
      const r = makeSpeakFn();
      speakFn = r.fn;
      speakCaptured = r.captured;
    }
    if (makeBulkSpeak) {
      const r = makeBulkSpeak();
      if (typeof r === 'function') bulkSpeakFn = r;
      else {
        bulkSpeakFn = r.fn;
        snapshots = r.snapshots;
      }
    }
    let actualRules = rules;
    let rulesCaptured;
    if (makeRules) {
      const r = makeRules();
      actualRules = r.rules;
      rulesCaptured = r.captured;
    }
    const chain = new Conversation('test topic', speakers, {
      ...(actualRules ? { rules: actualRules } : {}),
      ...(speakFn ? { speakFn } : {}),
      ...(bulkSpeakFn ? { bulkSpeakFn } : {}),
    });
    const messages = await chain.run();
    return { messages, chain, speakCaptured, rulesCaptured, snapshots, bulkSpeakFn };
  },
  expects: ({ result, inputs }) => {
    const { messages, chain, speakCaptured, rulesCaptured, snapshots, bulkSpeakFn } = result;
    if ('wantMessageCountAtLeast' in inputs) {
      expect(messages.length).toBeGreaterThanOrEqual(inputs.wantMessageCountAtLeast);
    }
    if ('wantMessageCountAtMost' in inputs) {
      expect(messages.length).toBeLessThanOrEqual(inputs.wantMessageCountAtMost);
    }
    if (inputs.wantSomeMessageIds) {
      for (const id of inputs.wantSomeMessageIds) {
        expect(messages.some((m) => m.id === id)).toBe(true);
      }
    }
    if (inputs.wantMessageIds) {
      expect(messages.map((m) => m.id)).toEqual(inputs.wantMessageIds);
    }
    if (inputs.wantAllMessageId) {
      expect(messages.every((m) => m.id === inputs.wantAllMessageId)).toBe(true);
    }
    if (inputs.wantTurnReduceBio) {
      expect(conversationTurnReduceMock).toBeDefined();
      expect(conversationTurnReduceMock.speakers[0].bio).toBe(inputs.wantTurnReduceBio);
    }
    if (inputs.wantBulkSpeakCalled) expect(bulkSpeakFn).toHaveBeenCalled();
    if (inputs.wantSomeMessageContains) {
      expect(messages.some((m) => m.comment.includes(inputs.wantSomeMessageContains))).toBe(true);
    }
    if (inputs.wantHistoryArray) {
      expect(rulesCaptured.history).toBeDefined();
      expect(Array.isArray(rulesCaptured.history)).toBe(true);
    }
    if (inputs.wantSpeakerMemoryHas) {
      for (const id of inputs.wantSpeakerMemoryHas) {
        expect(chain.speakerMemory.has(id)).toBe(true);
      }
    }
    if (inputs.wantSpeakerMemoryHasNot) {
      for (const id of inputs.wantSpeakerMemoryHasNot) {
        expect(chain.speakerMemory.has(id)).toBe(false);
      }
    }
    if (inputs.wantSpeakerMemoryLengths) {
      for (const [id, len] of Object.entries(inputs.wantSpeakerMemoryLengths)) {
        expect(chain.speakerMemory.get(id)).toHaveLength(len);
      }
    }
    if (inputs.wantSpeakerMemoryShape) {
      for (const [id, shape] of Object.entries(inputs.wantSpeakerMemoryShape)) {
        for (const m of chain.speakerMemory.get(id)) {
          expect(m).toMatchObject(shape);
        }
      }
    }
    if (inputs.wantTurnReduceMemoryIsMap) {
      expect(conversationTurnReduceMock.speakerMemory).toBeInstanceOf(Map);
    }
    if (inputs.wantCapturedMemoryGet) {
      for (const [id, shape] of Object.entries(inputs.wantCapturedMemoryGet)) {
        const memory = speakCaptured.memory;
        expect(memory).toBeInstanceOf(Map);
        const entries = memory.get(id);
        expect(entries).toHaveLength(shape.length);
        if (shape.firstComment) expect(entries[0].comment).toBe(shape.firstComment);
      }
    }
    if (inputs.wantSnapshotSizes) {
      inputs.wantSnapshotSizes.forEach((n, i) => {
        if (n === 0) expect(snapshots[i].size).toBe(0);
        else expect(snapshots[i].get('a')).toHaveLength(n);
      });
    }
  },
});
