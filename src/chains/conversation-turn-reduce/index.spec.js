import { vi, beforeEach, expect } from 'vitest';
import conversationTurnReduce from './index.js';
import map from '../map/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../map/index.js', () => ({ default: vi.fn() }));

beforeEach(() => map.mockClear());

const baseInput = {
  topic: 'product development strategy',
  history: [],
  rules: {},
  llm: 'test',
};

// ─── core behavior ──────────────────────────────────────────────────────

runTable({
  describe: 'conversationTurnReduce',
  examples: [
    {
      name: 'generates multiline responses for multiple speakers',
      inputs: {
        args: {
          speakers: [
            { id: 'alice', name: 'Alice', bio: 'software engineer' },
            { id: 'bob', name: 'Bob', bio: 'product manager' },
          ],
          topic: 'product development strategy',
          history: [],
          rules: {},
          llm: 'test',
        },
        mock: () =>
          map.mockResolvedValueOnce([
            `I think we should focus on user experience first.

The technical implementation can be refined later, but if we don't nail the UX, we'll lose users regardless of how elegant our code is.`,
            `Alice makes a great point about UX priority.

From a product perspective, I'd add that we also need to consider market timing. Even with perfect UX, if we're too late to market, competitors might have already established user habits.

What if we do a minimal viable UX first, then iterate?`,
          ]),
        wantLength: 2,
        wantContains: [
          { idx: 0, fragments: ['user experience first', 'technical implementation'] },
          { idx: 1, fragments: ['Alice makes a great point', 'minimal viable UX'] },
        ],
        wantMapCalls: 1,
        wantMapArgs: ['Alice\nBio: software engineer', 'Bob\nBio: product manager'],
      },
    },
    {
      name: 'handles single speaker',
      inputs: {
        args: { ...baseInput, speakers: [{ id: 'alice', name: 'Alice' }], topic: 'test topic' },
        mock: () => map.mockResolvedValueOnce(['This is my response to the topic.']),
        want: ['This is my response to the topic.'],
      },
    },
    {
      name: 'throws when no speakers provided',
      inputs: {
        args: { ...baseInput, speakers: [], topic: 'test topic' },
        throws: /speakers must be a non-empty array/,
      },
    },
    {
      name: 'throws when no topic provided',
      inputs: {
        args: { ...baseInput, speakers: [{ id: 'alice', name: 'Alice' }], topic: '' },
        throws: /topic is required/,
      },
    },
  ],
  process: async ({ args, mock }) => {
    if (mock) mock();
    return conversationTurnReduce(args);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('wantLength' in inputs) expect(result).toHaveLength(inputs.wantLength);
    if (inputs.wantContains) {
      for (const { idx, fragments } of inputs.wantContains) {
        for (const fragment of fragments) expect(result[idx]).toContain(fragment);
      }
    }
    if ('wantMapCalls' in inputs) expect(map).toHaveBeenCalledTimes(inputs.wantMapCalls);
    if (inputs.wantMapArgs) {
      expect(map).toHaveBeenCalledWith(
        inputs.wantMapArgs,
        expect.any(String),
        expect.objectContaining({ llm: 'test' })
      );
    }
  },
});

// ─── speaker memory integration ─────────────────────────────────────────

runTable({
  describe: 'conversationTurnReduce — speaker memory integration',
  examples: [
    {
      name: 'includes prior statements in speaker descriptions',
      inputs: {
        args: {
          speakers: [
            { id: 'alice', name: 'Alice', bio: 'engineer' },
            { id: 'bob', name: 'Bob' },
          ],
          topic: 'code quality',
          history: [],
          speakerMemory: new Map([
            [
              'alice',
              [
                {
                  id: 'alice',
                  name: 'Alice',
                  comment: 'I think we need more tests',
                  time: '10:00',
                },
                { id: 'alice', name: 'Alice', comment: 'Coverage is too low', time: '10:05' },
              ],
            ],
          ]),
          rules: {},
          llm: 'test',
        },
        mock: () => map.mockResolvedValueOnce(['Alice response', 'Bob response']),
        wantDescriptions: [
          {
            idx: 0,
            contains: [
              'Alice',
              'Bio: engineer',
              'Prior statements:',
              '[10:00] I think we need more tests',
              '[10:05] Coverage is too low',
            ],
          },
          { idx: 1, equals: 'Bob', notContains: ['Prior statements:'] },
        ],
      },
    },
    {
      name: 'omits prior statements section when memory is empty',
      inputs: {
        args: {
          ...baseInput,
          speakers: [{ id: 'alice', name: 'Alice' }],
          topic: 'test topic',
          speakerMemory: new Map(),
        },
        mock: () => map.mockResolvedValueOnce(['Alice response']),
        wantDescriptions: [{ idx: 0, equals: 'Alice', notContains: ['Prior statements:'] }],
      },
    },
    {
      name: 'works when speakerMemory is not provided (defaults to empty)',
      inputs: {
        args: { ...baseInput, speakers: [{ id: 'alice', name: 'Alice' }], topic: 'test topic' },
        mock: () => map.mockResolvedValueOnce(['Alice response']),
        wantDescriptions: [{ idx: 0, equals: 'Alice', notContains: ['Prior statements:'] }],
      },
    },
    {
      name: 'includes consistency instruction when speakers have memory',
      inputs: {
        args: {
          ...baseInput,
          speakers: [{ id: 'alice', name: 'Alice' }],
          topic: 'debate',
          speakerMemory: new Map([
            ['alice', [{ id: 'alice', name: 'Alice', comment: 'Prior point', time: '09:00' }]],
          ]),
        },
        mock: () => map.mockResolvedValueOnce(['Alice response']),
        wantInstructionsContains: ['maintain consistency', 'prior statements'],
      },
    },
  ],
  process: async ({ args, mock }) => {
    if (mock) mock();
    return conversationTurnReduce(args);
  },
  expects: ({ inputs }) => {
    if (inputs.wantDescriptions) {
      const descriptions = map.mock.calls[0][0];
      for (const spec of inputs.wantDescriptions) {
        if (spec.equals) expect(descriptions[spec.idx]).toBe(spec.equals);
        if (spec.contains) {
          for (const fragment of spec.contains) expect(descriptions[spec.idx]).toContain(fragment);
        }
        if (spec.notContains) {
          for (const fragment of spec.notContains) {
            expect(descriptions[spec.idx]).not.toContain(fragment);
          }
        }
      }
    }
    if (inputs.wantInstructionsContains) {
      const instructions = map.mock.calls[0][1];
      for (const fragment of inputs.wantInstructionsContains) {
        expect(instructions).toContain(fragment);
      }
    }
  },
});
