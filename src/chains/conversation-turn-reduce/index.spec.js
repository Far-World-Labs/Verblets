import { vi, beforeEach, expect } from 'vitest';
import conversationTurnReduce from './index.js';
import map from '../map/index.js';
import { runTable, throws } from '../../lib/examples-runner/index.js';

vi.mock('../map/index.js', () => ({ default: vi.fn() }));

beforeEach(() => map.mockClear());

const baseInput = {
  topic: 'product development strategy',
  history: [],
  rules: {},
  llm: 'test',
};

// ─── core behavior ────────────────────────────────────────────────────────

const examples = [
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
      preMock: () =>
        map.mockResolvedValueOnce([
          `I think we should focus on user experience first.

The technical implementation can be refined later, but if we don't nail the UX, we'll lose users regardless of how elegant our code is.`,
          `Alice makes a great point about UX priority.

From a product perspective, I'd add that we also need to consider market timing. Even with perfect UX, if we're too late to market, competitors might have already established user habits.

What if we do a minimal viable UX first, then iterate?`,
        ]),
    },
    check: ({ result }) => {
      expect(result).toHaveLength(2);
      expect(result[0]).toContain('user experience first');
      expect(result[0]).toContain('technical implementation');
      expect(result[1]).toContain('Alice makes a great point');
      expect(result[1]).toContain('minimal viable UX');
      expect(map).toHaveBeenCalledTimes(1);
      expect(map).toHaveBeenCalledWith(
        ['Alice\nBio: software engineer', 'Bob\nBio: product manager'],
        expect.any(String),
        expect.objectContaining({ llm: 'test' })
      );
    },
  },
  {
    name: 'handles single speaker',
    inputs: {
      args: { ...baseInput, speakers: [{ id: 'alice', name: 'Alice' }], topic: 'test topic' },
      preMock: () => map.mockResolvedValueOnce(['This is my response to the topic.']),
    },
    check: ({ result }) => {
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('This is my response to the topic.');
    },
  },
  {
    name: 'throws when no speakers provided',
    inputs: { args: { ...baseInput, speakers: [], topic: 'test topic' } },
    check: throws(/speakers must be a non-empty array/),
  },
  {
    name: 'throws when no topic provided',
    inputs: {
      args: { ...baseInput, speakers: [{ id: 'alice', name: 'Alice' }], topic: '' },
    },
    check: throws(/topic is required/),
  },
];

runTable({
  describe: 'conversationTurnReduce',
  examples,
  process: async ({ args, preMock }) => {
    if (preMock) preMock();
    return conversationTurnReduce(args);
  },
});

// ─── speaker memory integration ───────────────────────────────────────────

const memoryExamples = [
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
      preMock: () => map.mockResolvedValueOnce(['Alice response', 'Bob response']),
    },
    check: () => {
      const descriptions = map.mock.calls[0][0];
      expect(descriptions[0]).toContain('Alice');
      expect(descriptions[0]).toContain('Bio: engineer');
      expect(descriptions[0]).toContain('Prior statements:');
      expect(descriptions[0]).toContain('[10:00] I think we need more tests');
      expect(descriptions[0]).toContain('[10:05] Coverage is too low');
      expect(descriptions[1]).toBe('Bob');
      expect(descriptions[1]).not.toContain('Prior statements:');
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
      preMock: () => map.mockResolvedValueOnce(['Alice response']),
    },
    check: () => {
      const descriptions = map.mock.calls[0][0];
      expect(descriptions[0]).toBe('Alice');
      expect(descriptions[0]).not.toContain('Prior statements:');
    },
  },
  {
    name: 'works when speakerMemory is not provided (defaults to empty)',
    inputs: {
      args: { ...baseInput, speakers: [{ id: 'alice', name: 'Alice' }], topic: 'test topic' },
      preMock: () => map.mockResolvedValueOnce(['Alice response']),
    },
    check: () => {
      const descriptions = map.mock.calls[0][0];
      expect(descriptions[0]).toBe('Alice');
      expect(descriptions[0]).not.toContain('Prior statements:');
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
      preMock: () => map.mockResolvedValueOnce(['Alice response']),
    },
    check: () => {
      const instructions = map.mock.calls[0][1];
      expect(instructions).toContain('maintain consistency');
      expect(instructions).toContain('prior statements');
    },
  },
];

runTable({
  describe: 'conversationTurnReduce — speaker memory integration',
  examples: memoryExamples,
  process: async ({ args, preMock }) => {
    if (preMock) preMock();
    return conversationTurnReduce(args);
  },
});
