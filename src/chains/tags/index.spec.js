import { vi, beforeEach, expect } from 'vitest';
import tagItem, { tagSpec, mapTags, tagInstructions } from './index.js';
import { runTable, equals, all, partial } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../map/index.js', () => ({ default: vi.fn() }));

import llm from '../../lib/llm/index.js';
import map from '../map/index.js';

beforeEach(() => vi.clearAllMocks());

const mockVocabulary = {
  tags: [
    { id: 'urgent', label: 'Urgent', description: 'Requires immediate attention' },
    { id: 'financial', label: 'Financial', description: 'Related to money or finances' },
    { id: 'personal', label: 'Personal', description: 'Personal matters' },
  ],
  facet: 'task categories',
};

// ─── tagSpec ──────────────────────────────────────────────────────────────

runTable({
  describe: 'tagSpec',
  examples: [
    {
      name: 'generates tag specification from instructions',
      inputs: {
        instructions: 'Tag by priority and type',
        preMock: () => llm.mockResolvedValueOnce('Tag items based on urgency and category'),
      },
      check: all(equals('Tag items based on urgency and category'), () =>
        expect(llm).toHaveBeenCalledWith(
          expect.stringContaining('Tag by priority and type'),
          expect.objectContaining({
            systemPrompt: expect.stringContaining('tag specification generator'),
          })
        )
      ),
    },
  ],
  process: async ({ instructions, preMock }) => {
    if (preMock) preMock();
    return tagSpec(instructions);
  },
});

// ─── tagItem ──────────────────────────────────────────────────────────────

runTable({
  describe: 'tagItem',
  examples: [
    {
      name: 'tags a single item with spec generation',
      inputs: {
        item: 'Call mom',
        bundle: { text: 'Tag personal items', vocabulary: mockVocabulary },
        preMock: () =>
          llm.mockResolvedValueOnce('Generated spec').mockResolvedValueOnce(['personal']),
      },
      check: all(equals(['personal']), () => expect(llm).toHaveBeenCalledTimes(2)),
    },
  ],
  process: async ({ item, bundle, preMock }) => {
    if (preMock) preMock();
    return tagItem(item, bundle);
  },
});

// ─── mapTags ──────────────────────────────────────────────────────────────

runTable({
  describe: 'mapTags',
  examples: [
    {
      name: 'tags multiple items',
      inputs: {
        items: ['Task 1', 'Task 2', 'Task 3'],
        bundle: { text: 'Tag all tasks', vocabulary: mockVocabulary },
        preMock: () => {
          llm.mockResolvedValueOnce('Generated spec');
          map.mockResolvedValueOnce([['urgent'], ['financial', 'personal'], []]);
        },
      },
      check: all(equals([['urgent'], ['financial', 'personal'], []]), () => {
        expect(llm).toHaveBeenCalledTimes(1);
        expect(map).toHaveBeenCalledWith(
          ['Task 1', 'Task 2', 'Task 3'],
          expect.any(String),
          expect.objectContaining({
            responseFormat: expect.objectContaining({ type: 'json_schema' }),
          })
        );
      }),
    },
  ],
  process: async ({ items, bundle, preMock }) => {
    if (preMock) preMock();
    return mapTags(items, bundle);
  },
});

// ─── tagInstructions ──────────────────────────────────────────────────────

runTable({
  describe: 'tagInstructions',
  examples: [
    {
      name: 'returns instruction bundle with spec and vocabulary',
      inputs: { spec: 'Test spec', vocabulary: mockVocabulary },
      check: ({ result, inputs }) => {
        expect(result.text).toContain('tag specification');
        expect(result.spec).toBe(inputs.spec);
        expect(result.vocabulary).toBe(inputs.vocabulary);
        expect(result.vocabularyMode).toBe('strict');
      },
    },
    {
      name: 'allows vocabulary mode override',
      inputs: { spec: 'Test spec', vocabulary: mockVocabulary, vocabularyMode: 'open' },
      check: partial({ vocabularyMode: 'open' }),
    },
    {
      name: 'passes through additional context keys',
      inputs: { spec: 'spec', vocabulary: mockVocabulary, domain: 'customer support' },
      check: partial({ domain: 'customer support' }),
    },
  ],
  process: (params) => tagInstructions(params),
});
