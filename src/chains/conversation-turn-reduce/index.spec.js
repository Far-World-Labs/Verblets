import { vi, beforeEach, expect } from 'vitest';
import conversationTurnReduce from './index.js';
import map from '../map/index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

vi.mock('../map/index.js', () => ({ default: vi.fn() }));

beforeEach(() => map.mockClear());

const baseInput = {
  topic: 'product development strategy',
  history: [],
  rules: {},
  llm: 'test',
};

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
      },
      mocks: {
        map: [
          [
            `I think we should focus on user experience first.

The technical implementation can be refined later, but if we don't nail the UX, we'll lose users regardless of how elegant our code is.`,
            `Alice makes a great point about UX priority.

From a product perspective, I'd add that we also need to consider market timing. Even with perfect UX, if we're too late to market, competitors might have already established user habits.

What if we do a minimal viable UX first, then iterate?`,
          ],
        ],
      },
      want: {
        length: 2,
        contains: [
          { idx: 0, fragments: ['user experience first', 'technical implementation'] },
          { idx: 1, fragments: ['Alice makes a great point', 'minimal viable UX'] },
        ],
        mapCalls: 1,
        mapArgs: ['Alice\nBio: software engineer', 'Bob\nBio: product manager'],
      },
    },
    {
      name: 'handles single speaker',
      inputs: {
        args: { ...baseInput, speakers: [{ id: 'alice', name: 'Alice' }], topic: 'test topic' },
      },
      mocks: { map: [['This is my response to the topic.']] },
      want: { value: ['This is my response to the topic.'] },
    },
    {
      name: 'throws when no speakers provided',
      inputs: { args: { ...baseInput, speakers: [], topic: 'test topic' } },
      want: { throws: /speakers must be a non-empty array/ },
    },
    {
      name: 'throws when no topic provided',
      inputs: { args: { ...baseInput, speakers: [{ id: 'alice', name: 'Alice' }], topic: '' } },
      want: { throws: /topic is required/ },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { map });
    return conversationTurnReduce(inputs.args);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('value' in want) expect(result).toEqual(want.value);
    if ('length' in want) expect(result).toHaveLength(want.length);
    if (want.contains) {
      for (const { idx, fragments } of want.contains) {
        for (const fragment of fragments) expect(result[idx]).toContain(fragment);
      }
    }
    if ('mapCalls' in want) expect(map).toHaveBeenCalledTimes(want.mapCalls);
    if (want.mapArgs) {
      expect(map).toHaveBeenCalledWith(
        want.mapArgs,
        expect.any(String),
        expect.objectContaining({ llm: 'test' })
      );
    }
  },
});

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
      },
      mocks: { map: [['Alice response', 'Bob response']] },
      want: {
        descriptions: [
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
      },
      mocks: { map: [['Alice response']] },
      want: { descriptions: [{ idx: 0, equals: 'Alice', notContains: ['Prior statements:'] }] },
    },
    {
      name: 'works when speakerMemory is not provided (defaults to empty)',
      inputs: {
        args: { ...baseInput, speakers: [{ id: 'alice', name: 'Alice' }], topic: 'test topic' },
      },
      mocks: { map: [['Alice response']] },
      want: { descriptions: [{ idx: 0, equals: 'Alice', notContains: ['Prior statements:'] }] },
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
      },
      mocks: { map: [['Alice response']] },
      want: { instructionsContains: ['maintain consistency', 'prior statements'] },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { map });
    return conversationTurnReduce(inputs.args);
  },
  expects: ({ want }) => {
    if (want.descriptions) {
      const descriptions = map.mock.calls[0][0];
      for (const spec of want.descriptions) {
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
    if (want.instructionsContains) {
      const instructions = map.mock.calls[0][1];
      for (const fragment of want.instructionsContains) {
        expect(instructions).toContain(fragment);
      }
    }
  },
});
