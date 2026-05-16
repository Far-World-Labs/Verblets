import { vi, beforeEach, expect } from 'vitest';
import tagItem, { tagSpec, mapTags, tagInstructions } from './index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

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

runTable({
  describe: 'tagSpec',
  examples: [
    {
      name: 'generates tag specification from instructions',
      inputs: { instructions: 'Tag by priority and type' },
      mocks: { llm: ['Tag items based on urgency and category'] },
      want: {
        value: 'Tag items based on urgency and category',
        promptContains: 'Tag by priority and type',
        systemContains: 'tag specification generator',
      },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    return tagSpec(inputs.instructions);
  },
  expects: ({ result, want }) => {
    expect(result).toEqual(want.value);
    expect(llm).toHaveBeenCalledWith(
      expect.stringContaining(want.promptContains),
      expect.objectContaining({
        systemPrompt: expect.stringContaining(want.systemContains),
      })
    );
  },
});

runTable({
  describe: 'tagItem',
  examples: [
    {
      name: 'tags a single item with spec generation',
      inputs: {
        item: 'Call mom',
        bundle: { text: 'Tag personal items', vocabulary: mockVocabulary },
      },
      mocks: { llm: ['Generated spec', ['personal']] },
      want: { value: ['personal'], llmCalls: 2 },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    return tagItem(inputs.item, inputs.bundle);
  },
  expects: ({ result, want }) => {
    expect(result).toEqual(want.value);
    expect(llm).toHaveBeenCalledTimes(want.llmCalls);
  },
});

runTable({
  describe: 'mapTags',
  examples: [
    {
      name: 'tags multiple items',
      inputs: {
        items: ['Task 1', 'Task 2', 'Task 3'],
        bundle: { text: 'Tag all tasks', vocabulary: mockVocabulary },
      },
      mocks: {
        llm: ['Generated spec'],
        map: [[['urgent'], ['financial', 'personal'], []]],
      },
      want: { value: [['urgent'], ['financial', 'personal'], []], llmCalls: 1 },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm, map });
    return mapTags(inputs.items, inputs.bundle);
  },
  expects: ({ result, inputs, want }) => {
    expect(result).toEqual(want.value);
    expect(llm).toHaveBeenCalledTimes(want.llmCalls);
    expect(map).toHaveBeenCalledWith(
      inputs.items,
      expect.any(String),
      expect.objectContaining({
        responseFormat: expect.objectContaining({ type: 'json_schema' }),
      })
    );
  },
});

runTable({
  describe: 'tagInstructions',
  examples: [
    {
      name: 'returns instruction bundle with spec and vocabulary',
      inputs: { spec: 'Test spec', vocabulary: mockVocabulary },
      want: { textContains: 'tag specification', bundle: true },
    },
    {
      name: 'allows vocabulary mode override',
      inputs: { spec: 'Test spec', vocabulary: mockVocabulary, vocabularyMode: 'open' },
      want: { matches: { vocabularyMode: 'open' } },
    },
    {
      name: 'passes through additional context keys',
      inputs: { spec: 'spec', vocabulary: mockVocabulary, domain: 'customer support' },
      want: { matches: { domain: 'customer support' } },
    },
  ],
  process: ({ inputs }) => tagInstructions(inputs),
  expects: ({ result, inputs, want }) => {
    if (want.bundle) {
      expect(result.text).toContain(want.textContains);
      expect(result.spec).toBe(inputs.spec);
      expect(result.vocabulary).toBe(inputs.vocabulary);
      expect(result.vocabularyMode).toBe('strict');
    }
    if (want.matches) expect(result).toMatchObject(want.matches);
  },
});
