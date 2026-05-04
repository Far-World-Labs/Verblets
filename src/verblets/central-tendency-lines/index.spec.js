import { vi, beforeEach, expect } from 'vitest';
import centralTendency from './index.js';
import llm from '../../lib/llm/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

const happyResponse = {
  score: 0.85,
  reason: 'High feature overlap with seed items',
  confidence: 0.9,
};

// ─── input validation ────────────────────────────────────────────────────

runTable({
  describe: 'centralTendency — input validation',
  examples: [
    {
      name: 'rejects empty string item',
      inputs: {
        item: '',
        seedItems: ['seed1', 'seed2'],
        throws: 'Item must be a non-empty string',
      },
    },
    {
      name: 'rejects null item',
      inputs: { item: null, seedItems: ['seed1', 'seed2'], throws: 'null is not allowed' },
    },
    {
      name: 'rejects empty seedItems array',
      inputs: { item: 'item', seedItems: [], throws: 'seedItems must be a non-empty array' },
    },
    {
      name: 'rejects null seedItems',
      inputs: { item: 'item', seedItems: null, throws: 'seedItems must be a non-empty array' },
    },
  ],
  process: ({ item, seedItems }) => centralTendency(item, seedItems),
  expects: ({ error, inputs }) => {
    expect(error?.message).toContain(inputs.throws);
  },
});

// ─── result + config forwarding ───────────────────────────────────────────

runTable({
  describe: 'centralTendency — result and config forwarding',
  examples: [
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
        want: happyResponse,
        wantPromptContains: 'Evaluate how central',
        wantLlmConfig: { llm: { fast: true, good: true, cheap: true } },
      },
    },
  ],
  process: async ({ item, seedItems, config }) => {
    llm.mockResolvedValue(happyResponse);
    return centralTendency(item, seedItems, config);
  },
  expects: ({ result, inputs }) => {
    expect(result).toEqual(inputs.want);
    expect(llm).toHaveBeenCalledWith(
      expect.stringContaining(inputs.wantPromptContains),
      expect.objectContaining(inputs.wantLlmConfig)
    );
  },
});

// ─── prompt construction ─────────────────────────────────────────────────

runTable({
  describe: 'centralTendency — prompt construction',
  examples: [
    {
      name: 'embeds context, core-features, and seed-items in the prompt',
      inputs: {
        item: 'robin',
        seedItems: ['sparrow', 'bluejay'],
        config: {
          context: 'Bird evaluation context',
          coreFeatures: ['feathers', 'beak', 'flight'],
        },
        wantContains: [
          '<context>\nBird evaluation context\n</context>',
          '<core-features>\nfeathers, beak, flight\n</core-features>',
          '<seed-items>\nsparrow, bluejay\n</seed-items>',
        ],
      },
    },
  ],
  process: async ({ item, seedItems, config }) => {
    llm.mockResolvedValue({ score: 0.7, reason: 'r', confidence: 0.8 });
    await centralTendency(item, seedItems, config);
    return llm.mock.calls[0][0];
  },
  expects: ({ result, inputs }) => {
    for (const fragment of inputs.wantContains) {
      expect(result).toContain(fragment);
    }
  },
});
