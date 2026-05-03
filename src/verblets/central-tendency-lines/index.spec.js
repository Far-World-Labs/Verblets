import { vi, beforeEach, expect } from 'vitest';
import centralTendency from './index.js';
import llm from '../../lib/llm/index.js';
import { runTable, equals, throws, contains, all } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const happyResponse = {
  score: 0.85,
  reason: 'High feature overlap with seed items',
  confidence: 0.9,
};

// One table; rows that need to mock the LLM bring their own preMock and rows
// that want the prompt back set returnPrompt. Keeps assertions in the row.
const examples = [
  {
    name: 'rejects empty string item',
    inputs: { item: '', seedItems: ['seed1', 'seed2'] },
    check: throws('Item must be a non-empty string'),
  },
  {
    name: 'rejects null item',
    inputs: { item: null, seedItems: ['seed1', 'seed2'] },
    check: throws('null is not allowed'),
  },
  {
    name: 'rejects empty seedItems array',
    inputs: { item: 'item', seedItems: [] },
    check: throws('seedItems must be a non-empty array'),
  },
  {
    name: 'rejects null seedItems',
    inputs: { item: 'item', seedItems: null },
    check: throws('seedItems must be a non-empty array'),
  },
  {
    name: 'returns the LLM response and forwards llm config',
    inputs: {
      item: 'robin',
      seedItems: ['sparrow', 'bluejay', 'cardinal'],
      config: {
        context: 'Evaluate based on typical bird characteristics',
        coreFeatures: ['feathers', 'beak', 'lays eggs'],
        llm: { fast: true, good: true, cheap: true },
      },
      preMock: () => llm.mockResolvedValue(happyResponse),
    },
    check: all(equals(happyResponse), () => {
      expect(llm).toHaveBeenCalledWith(
        expect.stringContaining('Evaluate how central'),
        expect.objectContaining({ llm: { fast: true, good: true, cheap: true } })
      );
    }),
  },
  {
    name: 'embeds context, core-features, and seed-items in the prompt',
    inputs: {
      item: 'robin',
      seedItems: ['sparrow', 'bluejay'],
      config: {
        context: 'Bird evaluation context',
        coreFeatures: ['feathers', 'beak', 'flight'],
      },
      preMock: () => llm.mockResolvedValue({ score: 0.7, reason: 'r', confidence: 0.8 }),
      returnPrompt: true,
    },
    check: all(
      contains('<context>\nBird evaluation context\n</context>'),
      contains('<core-features>\nfeathers, beak, flight\n</core-features>'),
      contains('<seed-items>\nsparrow, bluejay\n</seed-items>')
    ),
  },
];

runTable({
  describe: 'centralTendency',
  examples,
  process: async ({ item, seedItems, config, preMock, returnPrompt }) => {
    if (preMock) preMock();
    const result = await centralTendency(item, seedItems, config);
    return returnPrompt ? llm.mock.calls[0][0] : result;
  },
});
