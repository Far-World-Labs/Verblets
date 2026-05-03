import { vi, beforeEach, expect } from 'vitest';
import tagVocabulary, {
  generateInitialVocabulary,
  refineVocabulary,
  computeTagStatistics,
} from './index.js';
import { runTable, equals, all, throws } from '../../lib/examples-runner/index.js';

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

// ─── computeTagStatistics ─────────────────────────────────────────────────

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
      check: ({ result }) => {
        expect(result.stats).toMatchObject({
          totalItems: 5,
          itemsWithTags: 5,
          coveragePercent: 100,
          unusedTags: 0,
        });
        expect(result.stats.avgTagsPerItem).toBeCloseTo(1.6);
        expect(result.mostUsed).toHaveLength(3);
        expect(result.mostUsed[0]).toMatchObject({ tag: { id: 'urgent' }, count: 2 });
        expect(result.leastUsed).toHaveLength(3);
        expect(result.problematicItems).toBeDefined();
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
      check: ({ result }) => {
        const untagged = result.problematicItems.filter((p) => p.type === 'untagged');
        const overtagged = result.problematicItems.filter((p) => p.type === 'overtagged');
        expect(untagged).toHaveLength(1);
        expect(untagged[0].itemIndex).toBe(1);
        expect(overtagged).toHaveLength(1);
        expect(overtagged[0]).toMatchObject({ itemIndex: 0, tagCount: 4 });
      },
    },
    {
      name: 'handles empty tag arrays',
      inputs: { vocab: mockVocabulary, tagged: [[], [], []] },
      check: ({ result }) =>
        expect(result.stats).toMatchObject({
          itemsWithTags: 0,
          coveragePercent: 0,
          avgTagsPerItem: 0,
          unusedTags: 5,
        }),
    },
  ],
  process: ({ vocab, tagged, options }) => computeTagStatistics(vocab, tagged, options),
});

// ─── generateInitialVocabulary ────────────────────────────────────────────

runTable({
  describe: 'generateInitialVocabulary',
  examples: [
    {
      name: 'generates vocabulary from text specification',
      inputs: {
        spec: 'Create tags for task management with urgency and category facets',
        items: mockItems.slice(0, 2),
        preMock: () => llm.mockResolvedValueOnce(mockVocabulary),
      },
      check: all(equals(mockVocabulary), () =>
        expect(llm).toHaveBeenCalledWith(
          expect.stringContaining(
            'Create tags for task management with urgency and category facets'
          ),
          expect.objectContaining({
            responseFormat: expect.objectContaining({ type: 'json_schema' }),
          })
        )
      ),
    },
    {
      name: 'includes sample items in generation',
      inputs: {
        spec: 'Task tags',
        items: mockItems,
        preMock: () => llm.mockResolvedValueOnce(mockVocabulary),
      },
      check: () => {
        const prompt = llm.mock.calls[0][0];
        expect(prompt).toContain('Pay credit card bill');
        expect(prompt).toContain('sample-items');
      },
    },
  ],
  process: async ({ spec, items, preMock }) => {
    if (preMock) preMock();
    return generateInitialVocabulary(spec, items);
  },
});

// ─── refineVocabulary ─────────────────────────────────────────────────────

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
        preMock: () => llm.mockResolvedValueOnce(refinedVocab),
      },
      check: ({ result }) => {
        const prompt = llm.mock.calls[0][0];
        expect(prompt).toContain('usage-statistics');
        expect(prompt).toContain('most-used-tags');
        expect(prompt).toContain('least-used-tags');
        expect(result).toEqual(refinedVocab);
      },
    },
    {
      name: 'includes problematic items in refinement',
      inputs: {
        vocab: mockVocabulary,
        tagged: [['urgent', 'financial', 'personal', 'work'], [], ['financial']],
        spec: 'Tags',
        preMock: () => llm.mockResolvedValueOnce(mockVocabulary),
      },
      check: () => {
        const prompt = llm.mock.calls[0][0];
        expect(prompt).toContain('problematic-items');
        expect(prompt).toContain('untagged');
        expect(prompt).toContain('overtagged');
      },
    },
  ],
  process: async ({ vocab, tagged, spec, preMock }) => {
    if (preMock) preMock();
    return refineVocabulary(vocab, tagged, spec);
  },
});

// ─── tagVocabulary (orchestrator) ─────────────────────────────────────────

runTable({
  describe: 'tagVocabulary',
  examples: [
    {
      name: 'generates and refines vocabulary with tagger',
      inputs: {
        spec: 'Task tags',
        items: mockItems,
        options: { sampleSize: 2 },
        preMock: () => {
          llm.mockResolvedValueOnce(mockVocabulary).mockResolvedValueOnce(mockVocabulary);
          const tagger = vi.fn();
          tagger.mockResolvedValueOnce([['urgent', 'financial'], ['personal'], ['financial']]);
          return tagger;
        },
      },
      check: ({ result }) => {
        expect(llm).toHaveBeenCalledTimes(2);
        expect(result.tagger).toHaveBeenCalledWith(mockItems, mockVocabulary);
        expect(result.value).toEqual(mockVocabulary);
      },
    },
    {
      name: 'throws without tagger',
      inputs: { spec: 'Task tags', items: mockItems, options: {} },
      check: throws(/tagger function must be provided/),
    },
    {
      name: 'respects sample size',
      inputs: {
        spec: 'Tags',
        items: Array(100).fill('item'),
        options: { sampleSize: 10 },
        preMock: () => {
          llm.mockResolvedValueOnce(mockVocabulary).mockResolvedValueOnce(mockVocabulary);
          return vi.fn(() => Promise.resolve([]));
        },
      },
      check: () => {
        const prompt = llm.mock.calls[0][0];
        expect(prompt).toContain('<sample-items>');
        expect(prompt).toContain('</sample-items>');
        const sampleMatch = prompt.match(/<sample-items>([\s\S]*?)<\/sample-items>/);
        expect(sampleMatch).toBeTruthy();
        expect(JSON.parse(sampleMatch[1])).toHaveLength(10);
      },
    },
    {
      name: 'works with a mock tags chain',
      inputs: {
        spec: 'Categorize by urgency and type',
        items: ['urgent task', 'tax filing', 'other item'],
        preMock: () => {
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
      },
      check: ({ result }) => {
        expect(result.tagger).toHaveBeenCalled();
        expect(result.value).toBeDefined();
      },
    },
  ],
  process: async ({ spec, items, options, preMock }) => {
    const tagger = preMock?.();
    const value = await tagVocabulary(spec, items, { ...options, tagger });
    return { value, tagger };
  },
});
