import { vi, beforeEach, expect } from 'vitest';
import tagVocabulary, {
  generateInitialVocabulary,
  refineVocabulary,
  computeTagStatistics,
} from './index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

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
      },
      want: {
        stats: { totalItems: 5, itemsWithTags: 5, coveragePercent: 100, unusedTags: 0 },
        avgTagsPerItem: 1.6,
        mostUsedLength: 3,
        mostUsedFirst: { tag: { id: 'urgent' }, count: 2 },
        leastUsedLength: 3,
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
      },
      want: {
        untagged: { length: 1, firstIndex: 1 },
        overtagged: { length: 1, firstShape: { itemIndex: 0, tagCount: 4 } },
      },
    },
    {
      name: 'handles empty tag arrays',
      inputs: { vocab: mockVocabulary, tagged: [[], [], []] },
      want: {
        stats: { itemsWithTags: 0, coveragePercent: 0, avgTagsPerItem: 0, unusedTags: 5 },
      },
    },
  ],
  process: ({ inputs }) => computeTagStatistics(inputs.vocab, inputs.tagged, inputs.options),
  expects: ({ result, want }) => {
    if (want.stats) expect(result.stats).toMatchObject(want.stats);
    if ('avgTagsPerItem' in want) {
      expect(result.stats.avgTagsPerItem).toBeCloseTo(want.avgTagsPerItem);
    }
    if ('mostUsedLength' in want) {
      expect(result.mostUsed).toHaveLength(want.mostUsedLength);
    }
    if (want.mostUsedFirst) expect(result.mostUsed[0]).toMatchObject(want.mostUsedFirst);
    if ('leastUsedLength' in want) {
      expect(result.leastUsed).toHaveLength(want.leastUsedLength);
      expect(result.problematicItems).toBeDefined();
    }
    if (want.untagged) {
      const untagged = result.problematicItems.filter((p) => p.type === 'untagged');
      expect(untagged).toHaveLength(want.untagged.length);
      expect(untagged[0].itemIndex).toBe(want.untagged.firstIndex);
    }
    if (want.overtagged) {
      const overtagged = result.problematicItems.filter((p) => p.type === 'overtagged');
      expect(overtagged).toHaveLength(want.overtagged.length);
      expect(overtagged[0]).toMatchObject(want.overtagged.firstShape);
    }
  },
});

runTable({
  describe: 'generateInitialVocabulary',
  examples: [
    {
      name: 'generates vocabulary from text specification',
      inputs: {
        spec: 'Create tags for task management with urgency and category facets',
        items: mockItems.slice(0, 2),
      },
      mocks: { llm: [mockVocabulary] },
      want: {
        value: mockVocabulary,
        promptContains: ['Create tags for task management with urgency and category facets'],
        jsonSchema: true,
      },
    },
    {
      name: 'includes sample items in generation',
      inputs: { spec: 'Task tags', items: mockItems },
      mocks: { llm: [mockVocabulary] },
      want: { promptContains: ['Pay credit card bill', 'sample-items'] },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    return generateInitialVocabulary(inputs.spec, inputs.items);
  },
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    const prompt = llm.mock.calls[0][0];
    if (want.promptContains) {
      for (const fragment of want.promptContains) expect(prompt).toContain(fragment);
    }
    if (want.jsonSchema) {
      expect(llm).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          responseFormat: expect.objectContaining({ type: 'json_schema' }),
        })
      );
    }
  },
});

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
      },
      mocks: { llm: [refinedVocab] },
      want: {
        value: refinedVocab,
        promptContains: ['usage-statistics', 'most-used-tags', 'least-used-tags'],
      },
    },
    {
      name: 'includes problematic items in refinement',
      inputs: {
        vocab: mockVocabulary,
        tagged: [['urgent', 'financial', 'personal', 'work'], [], ['financial']],
        spec: 'Tags',
      },
      mocks: { llm: [mockVocabulary] },
      want: { promptContains: ['problematic-items', 'untagged', 'overtagged'] },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    return refineVocabulary(inputs.vocab, inputs.tagged, inputs.spec);
  },
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    if (want.promptContains) {
      const prompt = llm.mock.calls[0][0];
      for (const fragment of want.promptContains) expect(prompt).toContain(fragment);
    }
  },
});

runTable({
  describe: 'tagVocabulary',
  examples: [
    {
      name: 'generates and refines vocabulary with tagger',
      inputs: {
        spec: 'Task tags',
        items: mockItems,
        options: { sampleSize: 2 },
        makeTagger: () => {
          const tagger = vi.fn();
          tagger.mockResolvedValueOnce([['urgent', 'financial'], ['personal'], ['financial']]);
          return tagger;
        },
      },
      mocks: { llm: [mockVocabulary, mockVocabulary] },
      want: { llmCalls: 2, taggerCalledWith: [mockItems, mockVocabulary], value: mockVocabulary },
    },
    {
      name: 'throws without tagger',
      inputs: { spec: 'Task tags', items: mockItems, options: {} },
      want: { throws: /tagger function must be provided/ },
    },
    {
      name: 'respects sample size',
      inputs: {
        spec: 'Tags',
        items: Array(100).fill('item'),
        options: { sampleSize: 10 },
        makeTagger: () => vi.fn(() => Promise.resolve([])),
      },
      mocks: { llm: [mockVocabulary, mockVocabulary] },
      want: { sampleItemsLength: 10 },
    },
    {
      name: 'works with a mock tags chain',
      inputs: {
        spec: 'Categorize by urgency and type',
        items: ['urgent task', 'tax filing', 'other item'],
        makeTagger: () =>
          vi.fn(async (items) =>
            items.map((item) => {
              const tags = [];
              if (item.includes('urgent') || item.includes('bill')) tags.push('urgent');
              if (item.includes('financial') || item.includes('tax')) tags.push('financial');
              return tags;
            })
          ),
      },
      mocks: { llm: [mockVocabulary, mockVocabulary] },
      want: { taggerCalled: true, valueDefined: true },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    const tagger = inputs.makeTagger?.();
    const value = await tagVocabulary(inputs.spec, inputs.items, { ...inputs.options, tagger });
    return { value, tagger };
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('llmCalls' in want) expect(llm).toHaveBeenCalledTimes(want.llmCalls);
    if (want.taggerCalledWith) {
      expect(result.tagger).toHaveBeenCalledWith(...want.taggerCalledWith);
    }
    if (want.taggerCalled) expect(result.tagger).toHaveBeenCalled();
    if ('value' in want) expect(result.value).toEqual(want.value);
    if (want.valueDefined) expect(result.value).toBeDefined();
    if ('sampleItemsLength' in want) {
      const prompt = llm.mock.calls[0][0];
      expect(prompt).toContain('<sample-items>');
      const sampleMatch = prompt.match(/<sample-items>([\s\S]*?)<\/sample-items>/);
      expect(JSON.parse(sampleMatch[1])).toHaveLength(want.sampleItemsLength);
    }
  },
});
