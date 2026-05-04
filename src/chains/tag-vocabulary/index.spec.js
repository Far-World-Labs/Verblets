import { vi, beforeEach, expect } from 'vitest';
import tagVocabulary, {
  generateInitialVocabulary,
  refineVocabulary,
  computeTagStatistics,
} from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

import llm from '../../lib/llm/index.js';

beforeEach(() => vi.clearAllMocks());

const mockItems = [
  'Pay credit card bill',
  'Schedule dentist appointment',
  'Quarterly tax filing',
  'Buy groceries',
  'Team meeting at 3pm',
];

const mockVocabulary = {
  tags: [
    { id: 'urgent', label: 'Urgent', description: 'Immediate action needed' },
    { id: 'financial', label: 'Financial', description: 'Money related' },
    { id: 'personal', label: 'Personal', description: 'Personal tasks' },
    { id: 'work', label: 'Work', description: 'Work related' },
    { id: 'health', label: 'Health', description: 'Health related' },
  ],
};

// ─── computeTagStatistics ──────────────────────────────────────────────

runTable({
  describe: 'computeTagStatistics',
  examples: [
    {
      name: 'computes tag usage statistics',
      inputs: {
        vocab: mockVocabulary,
        tagged: [
          ['urgent', 'financial'],
          ['personal', 'health'],
          ['financial'],
          ['work'],
          ['urgent', 'work'],
        ],
        wantStats: {
          totalItems: 5,
          itemsWithTags: 5,
          coveragePercent: 100,
          unusedTags: 0,
        },
        wantAvgTagsPerItem: 1.6,
        wantMostUsedLength: 3,
        wantMostUsedFirst: { tag: { id: 'urgent' }, count: 2 },
        wantLeastUsedLength: 3,
      },
    },
    {
      name: 'identifies problematic items',
      inputs: {
        vocab: mockVocabulary,
        tagged: [
          ['urgent', 'financial', 'personal', 'work'],
          [],
          ['financial'],
          ['work'],
          ['urgent'],
        ],
        options: { problematicSampleSize: 2 },
        wantUntagged: { length: 1, firstIndex: 1 },
        wantOvertagged: { length: 1, firstShape: { itemIndex: 0, tagCount: 4 } },
      },
    },
    {
      name: 'handles empty tag arrays',
      inputs: {
        vocab: mockVocabulary,
        tagged: [[], [], []],
        wantStats: {
          itemsWithTags: 0,
          coveragePercent: 0,
          avgTagsPerItem: 0,
          unusedTags: 5,
        },
      },
    },
  ],
  process: ({ vocab, tagged, options }) => computeTagStatistics(vocab, tagged, options),
  expects: ({ result, inputs }) => {
    if (inputs.wantStats) expect(result.stats).toMatchObject(inputs.wantStats);
    if ('wantAvgTagsPerItem' in inputs) {
      expect(result.stats.avgTagsPerItem).toBeCloseTo(inputs.wantAvgTagsPerItem);
    }
    if ('wantMostUsedLength' in inputs) {
      expect(result.mostUsed).toHaveLength(inputs.wantMostUsedLength);
    }
    if (inputs.wantMostUsedFirst)
      expect(result.mostUsed[0]).toMatchObject(inputs.wantMostUsedFirst);
    if ('wantLeastUsedLength' in inputs) {
      expect(result.leastUsed).toHaveLength(inputs.wantLeastUsedLength);
      expect(result.problematicItems).toBeDefined();
    }
    if (inputs.wantUntagged) {
      const untagged = result.problematicItems.filter((p) => p.type === 'untagged');
      expect(untagged).toHaveLength(inputs.wantUntagged.length);
      expect(untagged[0].itemIndex).toBe(inputs.wantUntagged.firstIndex);
    }
    if (inputs.wantOvertagged) {
      const overtagged = result.problematicItems.filter((p) => p.type === 'overtagged');
      expect(overtagged).toHaveLength(inputs.wantOvertagged.length);
      expect(overtagged[0]).toMatchObject(inputs.wantOvertagged.firstShape);
    }
  },
});

// ─── generateInitialVocabulary ──────────────────────────────────────────

runTable({
  describe: 'generateInitialVocabulary',
  examples: [
    {
      name: 'generates vocabulary from text specification',
      inputs: {
        spec: 'Create tags for task management with urgency and category facets',
        items: mockItems.slice(0, 2),
        mock: () => llm.mockResolvedValueOnce(mockVocabulary),
        want: mockVocabulary,
        wantPromptContains: ['Create tags for task management with urgency and category facets'],
        wantJsonSchema: true,
      },
    },
    {
      name: 'includes sample items in generation',
      inputs: {
        spec: 'Task tags',
        items: mockItems,
        mock: () => llm.mockResolvedValueOnce(mockVocabulary),
        wantPromptContains: ['Pay credit card bill', 'sample-items'],
      },
    },
  ],
  process: async ({ spec, items, mock }) => {
    if (mock) mock();
    return generateInitialVocabulary(spec, items);
  },
  expects: ({ result, inputs }) => {
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    const prompt = llm.mock.calls[0][0];
    if (inputs.wantPromptContains) {
      for (const fragment of inputs.wantPromptContains) expect(prompt).toContain(fragment);
    }
    if (inputs.wantJsonSchema) {
      expect(llm).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          responseFormat: expect.objectContaining({ type: 'json_schema' }),
        })
      );
    }
  },
});

// ─── refineVocabulary ──────────────────────────────────────────────────

const refinedVocab = {
  ...mockVocabulary,
  tags: [
    ...mockVocabulary.tags.slice(0, 4),
    { id: 'routine', label: 'Routine', description: 'Regular tasks' },
  ],
};

runTable({
  describe: 'refineVocabulary',
  examples: [
    {
      name: 'refines vocabulary based on usage',
      inputs: {
        vocab: mockVocabulary,
        tagged: [
          ['urgent', 'financial'],
          ['personal'],
          ['financial'],
          ['work'],
          ['urgent', 'work'],
        ],
        spec: 'Task management tags',
        mock: () => llm.mockResolvedValueOnce(refinedVocab),
        want: refinedVocab,
        wantPromptContains: ['usage-statistics', 'most-used-tags', 'least-used-tags'],
      },
    },
    {
      name: 'includes problematic items in refinement',
      inputs: {
        vocab: mockVocabulary,
        tagged: [['urgent', 'financial', 'personal', 'work'], [], ['financial']],
        spec: 'Tags',
        mock: () => llm.mockResolvedValueOnce(mockVocabulary),
        wantPromptContains: ['problematic-items', 'untagged', 'overtagged'],
      },
    },
  ],
  process: async ({ vocab, tagged, spec, mock }) => {
    if (mock) mock();
    return refineVocabulary(vocab, tagged, spec);
  },
  expects: ({ result, inputs }) => {
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if (inputs.wantPromptContains) {
      const prompt = llm.mock.calls[0][0];
      for (const fragment of inputs.wantPromptContains) expect(prompt).toContain(fragment);
    }
  },
});

// ─── tagVocabulary (orchestrator) ──────────────────────────────────────

runTable({
  describe: 'tagVocabulary',
  examples: [
    {
      name: 'generates and refines vocabulary with tagger',
      inputs: {
        spec: 'Task tags',
        items: mockItems,
        options: { sampleSize: 2 },
        mock: () => {
          llm.mockResolvedValueOnce(mockVocabulary).mockResolvedValueOnce(mockVocabulary);
          const tagger = vi.fn();
          tagger.mockResolvedValueOnce([['urgent', 'financial'], ['personal'], ['financial']]);
          return tagger;
        },
        wantLlmCalls: 2,
        wantTaggerCalledWith: [mockItems, mockVocabulary],
        wantValue: mockVocabulary,
      },
    },
    {
      name: 'throws without tagger',
      inputs: {
        spec: 'Task tags',
        items: mockItems,
        options: {},
        throws: /tagger function must be provided/,
      },
    },
    {
      name: 'respects sample size',
      inputs: {
        spec: 'Tags',
        items: Array(100).fill('item'),
        options: { sampleSize: 10 },
        mock: () => {
          llm.mockResolvedValueOnce(mockVocabulary).mockResolvedValueOnce(mockVocabulary);
          return vi.fn(() => Promise.resolve([]));
        },
        wantSampleItemsLength: 10,
      },
    },
    {
      name: 'works with a mock tags chain',
      inputs: {
        spec: 'Categorize by urgency and type',
        items: ['urgent task', 'tax filing', 'other item'],
        mock: () => {
          llm.mockResolvedValueOnce(mockVocabulary).mockResolvedValueOnce(mockVocabulary);
          return vi.fn(async (items) =>
            items.map((item) => {
              const tags = [];
              if (item.includes('urgent') || item.includes('bill')) tags.push('urgent');
              if (item.includes('financial') || item.includes('tax')) tags.push('financial');
              return tags;
            })
          );
        },
        wantTaggerCalled: true,
        wantValueDefined: true,
      },
    },
  ],
  process: async ({ spec, items, options, mock }) => {
    const tagger = mock?.();
    const value = await tagVocabulary(spec, items, { ...options, tagger });
    return { value, tagger };
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('wantLlmCalls' in inputs) expect(llm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
    if (inputs.wantTaggerCalledWith) {
      expect(result.tagger).toHaveBeenCalledWith(...inputs.wantTaggerCalledWith);
    }
    if (inputs.wantTaggerCalled) expect(result.tagger).toHaveBeenCalled();
    if ('wantValue' in inputs) expect(result.value).toEqual(inputs.wantValue);
    if (inputs.wantValueDefined) expect(result.value).toBeDefined();
    if ('wantSampleItemsLength' in inputs) {
      const prompt = llm.mock.calls[0][0];
      expect(prompt).toContain('<sample-items>');
      const sampleMatch = prompt.match(/<sample-items>([\s\S]*?)<\/sample-items>/);
      expect(JSON.parse(sampleMatch[1])).toHaveLength(inputs.wantSampleItemsLength);
    }
  },
});
