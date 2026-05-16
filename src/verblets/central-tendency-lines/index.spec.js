import { vi, beforeEach, expect } from 'vitest';
import centralTendency from './index.js';
import llm from '../../lib/llm/index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

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
      inputs: { item: '', seedItems: ['seed1', 'seed2'] },
      want: { throws: 'Item must be a non-empty string' },
    },
    {
      name: 'rejects null item',
      inputs: { item: null, seedItems: ['seed1', 'seed2'] },
      want: { throws: 'null is not allowed' },
    },
    {
      name: 'rejects empty seedItems array',
      inputs: { item: 'item', seedItems: [] },
      want: { throws: 'seedItems must be a non-empty array' },
    },
    {
      name: 'rejects null seedItems',
      inputs: { item: 'item', seedItems: null },
      want: { throws: 'seedItems must be a non-empty array' },
    },
  ],
  process: ({ inputs }) => centralTendency(inputs.item, inputs.seedItems),
  expects: ({ error, want }) => expect(error?.message).toContain(want.throws),
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
      },
      mocks: { llm: [happyResponse] },
      want: {
        value: happyResponse,
        promptContains: 'Evaluate how central',
        llmConfig: { llm: { fast: true, good: true, cheap: true } },
      },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    return centralTendency(inputs.item, inputs.seedItems, inputs.config);
  },
  expects: ({ result, want }) => {
    expect(result).toEqual(want.value);
    expect(llm).toHaveBeenCalledWith(
      expect.stringContaining(want.promptContains),
      expect.objectContaining(want.llmConfig)
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
      },
      mocks: { llm: [{ score: 0.7, reason: 'r', confidence: 0.8 }] },
      want: {
        contains: [
          '<context>\nBird evaluation context\n</context>',
          '<core-features>\nfeathers, beak, flight\n</core-features>',
          '<seed-items>\nsparrow, bluejay\n</seed-items>',
        ],
      },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    await centralTendency(inputs.item, inputs.seedItems, inputs.config);
    return llm.mock.calls[0][0];
  },
  expects: ({ result, want }) => {
    for (const fragment of want.contains) expect(result).toContain(fragment);
  },
});
