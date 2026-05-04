import { vi, beforeEach, expect } from 'vitest';
import tagItem, { tagSpec, mapTags, tagInstructions } from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

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

// ─── tagSpec ─────────────────────────────────────────────────────────────

runTable({
  describe: 'tagSpec',
  examples: [
    {
      name: 'generates tag specification from instructions',
      inputs: {
        instructions: 'Tag by priority and type',
        mock: () => llm.mockResolvedValueOnce('Tag items based on urgency and category'),
        want: 'Tag items based on urgency and category',
        wantPromptContains: 'Tag by priority and type',
        wantSystemContains: 'tag specification generator',
      },
    },
  ],
  process: async ({ instructions, mock }) => {
    if (mock) mock();
    return tagSpec(instructions);
  },
  expects: ({ result, inputs }) => {
    expect(result).toEqual(inputs.want);
    expect(llm).toHaveBeenCalledWith(
      expect.stringContaining(inputs.wantPromptContains),
      expect.objectContaining({
        systemPrompt: expect.stringContaining(inputs.wantSystemContains),
      })
    );
  },
});

// ─── tagItem ─────────────────────────────────────────────────────────────

runTable({
  describe: 'tagItem',
  examples: [
    {
      name: 'tags a single item with spec generation',
      inputs: {
        item: 'Call mom',
        bundle: { text: 'Tag personal items', vocabulary: mockVocabulary },
        mock: () => llm.mockResolvedValueOnce('Generated spec').mockResolvedValueOnce(['personal']),
        want: ['personal'],
        wantLlmCalls: 2,
      },
    },
  ],
  process: async ({ item, bundle, mock }) => {
    if (mock) mock();
    return tagItem(item, bundle);
  },
  expects: ({ result, inputs }) => {
    expect(result).toEqual(inputs.want);
    expect(llm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
  },
});

// ─── mapTags ─────────────────────────────────────────────────────────────

runTable({
  describe: 'mapTags',
  examples: [
    {
      name: 'tags multiple items',
      inputs: {
        items: ['Task 1', 'Task 2', 'Task 3'],
        bundle: { text: 'Tag all tasks', vocabulary: mockVocabulary },
        mock: () => {
          llm.mockResolvedValueOnce('Generated spec');
          map.mockResolvedValueOnce([['urgent'], ['financial', 'personal'], []]);
        },
        want: [['urgent'], ['financial', 'personal'], []],
        wantLlmCalls: 1,
      },
    },
  ],
  process: async ({ items, bundle, mock }) => {
    if (mock) mock();
    return mapTags(items, bundle);
  },
  expects: ({ result, inputs }) => {
    expect(result).toEqual(inputs.want);
    expect(llm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
    expect(map).toHaveBeenCalledWith(
      inputs.items,
      expect.any(String),
      expect.objectContaining({
        responseFormat: expect.objectContaining({ type: 'json_schema' }),
      })
    );
  },
});

// ─── tagInstructions ─────────────────────────────────────────────────────

runTable({
  describe: 'tagInstructions',
  examples: [
    {
      name: 'returns instruction bundle with spec and vocabulary',
      inputs: {
        spec: 'Test spec',
        vocabulary: mockVocabulary,
        wantTextContains: 'tag specification',
        wantBundle: true,
      },
    },
    {
      name: 'allows vocabulary mode override',
      inputs: {
        spec: 'Test spec',
        vocabulary: mockVocabulary,
        vocabularyMode: 'open',
        want: { vocabularyMode: 'open' },
      },
    },
    {
      name: 'passes through additional context keys',
      inputs: {
        spec: 'spec',
        vocabulary: mockVocabulary,
        domain: 'customer support',
        want: { domain: 'customer support' },
      },
    },
  ],
  process: (params) => tagInstructions(params),
  expects: ({ result, inputs }) => {
    if (inputs.wantBundle) {
      expect(result.text).toContain(inputs.wantTextContains);
      expect(result.spec).toBe(inputs.spec);
      expect(result.vocabulary).toBe(inputs.vocabulary);
      expect(result.vocabularyMode).toBe('strict');
    }
    if ('want' in inputs) expect(result).toMatchObject(inputs.want);
  },
});
