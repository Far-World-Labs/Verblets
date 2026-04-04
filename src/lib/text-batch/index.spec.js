import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock model service to control token estimation and model properties
vi.mock('../../services/llm-model/index.js', () => ({
  default: {
    bestPublicModelKey: 'test-model',
    getModel: vi.fn(() => ({
      maxContextWindow: 128_000,
      maxOutputTokens: 8192,
    })),
  },
  resolveModel: vi.fn(() => 'test-model'),
}));

// Mock getOptions to pass through config values
vi.mock('../context/option.js', () => ({
  getOptions: vi.fn(async (config, defaults) => ({
    outputRatio: config.outputRatio ?? defaults.outputRatio,
    maxTokenBudget: config.maxTokenBudget ?? defaults.maxTokenBudget,
  })),
}));

const { default: createBatches } = await import('./index.js');
const modelService = (await import('../../services/llm-model/index.js')).default;

describe('createBatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modelService.getModel.mockReturnValue({
      maxContextWindow: 128_000,
      maxOutputTokens: 8192,
    });
  });

  it('returns a single batch for a small list', async () => {
    const items = ['apple', 'banana', 'cherry'];
    const batches = await createBatches(items, { maxTokenBudget: 10_000 });

    expect(batches.length).toBe(1);
    expect(batches[0].items).toEqual(items);
    expect(batches[0].startIndex).toBe(0);
  });

  it('respects explicit batchSize', async () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const batches = await createBatches(items, { batchSize: 2, maxTokenBudget: 100_000 });

    expect(batches.length).toBe(3);
    expect(batches[0].items).toEqual(['a', 'b']);
    expect(batches[0].startIndex).toBe(0);
    expect(batches[1].items).toEqual(['c', 'd']);
    expect(batches[1].startIndex).toBe(2);
    expect(batches[2].items).toEqual(['e']);
    expect(batches[2].startIndex).toBe(4);
  });

  it('splits batches when token budget is exceeded', async () => {
    // With fallback tokenizer: 0.25 tokens/char
    // Each item ~500 chars = ~125 tokens
    const longItem = 'x'.repeat(500);
    const items = [longItem, longItem, longItem, longItem];

    // Very tight budget: inputBudget = maxTokenBudget / (1 + outputRatio)
    // With maxTokenBudget=400, outputRatio=2: inputBudget = 400/3 = 133
    // Each item is ~125 tokens, so only 1 fits per batch
    const batches = await createBatches(items, { maxTokenBudget: 400 });

    expect(batches.length).toBe(4);
    for (let i = 0; i < 4; i++) {
      expect(batches[i].items).toEqual([longItem]);
      expect(batches[i].startIndex).toBe(i);
    }
  });

  it('isolates oversized items in single-item batches instead of skipping', async () => {
    // inputBudget = 400 / 3 = 133 tokens
    // Small item: 10 chars = ~3 tokens (fits)
    // Oversized item: 2000 chars = 500 tokens (exceeds inputBudget of 133)
    const small = 'small';
    const oversized = 'x'.repeat(2000);
    const items = [small, oversized, small];

    const batches = await createBatches(items, { maxTokenBudget: 400 });

    // No batch should have skip:true
    for (const batch of batches) {
      expect(batch.skip).toBeUndefined();
      expect(batch.items.length).toBeGreaterThan(0);
    }

    // The oversized item is in its own batch
    const oversizedBatch = batches.find((b) => b.items.includes(oversized));
    expect(oversizedBatch).toBeDefined();
    expect(oversizedBatch.items).toEqual([oversized]);
    expect(oversizedBatch.startIndex).toBe(1);
  });

  it('preserves item order across all batches', async () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'];
    const batches = await createBatches(items, { batchSize: 2, maxTokenBudget: 100_000 });

    const reconstructed = batches.flatMap((b) => b.items);
    expect(reconstructed).toEqual(items);

    // startIndex values should be monotonically increasing
    for (let i = 1; i < batches.length; i++) {
      expect(batches[i].startIndex).toBeGreaterThan(batches[i - 1].startIndex);
    }
  });

  it('handles empty list', async () => {
    const batches = await createBatches([], { maxTokenBudget: 10_000 });
    expect(batches).toEqual([]);
  });

  it('handles single item', async () => {
    const batches = await createBatches(['only'], { maxTokenBudget: 10_000 });
    expect(batches.length).toBe(1);
    expect(batches[0].items).toEqual(['only']);
    expect(batches[0].startIndex).toBe(0);
  });

  it('flushes current batch before isolating an oversized item', async () => {
    // Tight budget where oversized exceeds inputBudget
    // inputBudget = 300 / 3 = 100 tokens
    const normal = 'hi'; // ~1 token
    const oversized = 'y'.repeat(2000); // ~500 tokens > 100

    const items = [normal, normal, oversized, normal];
    // Use explicit batchSize=2 so the auto-calculator doesn't shrink to 1
    // (auto-calc sees the oversized item and conservatively picks batchSize=1)
    const batches = await createBatches(items, { maxTokenBudget: 300, batchSize: 2 });

    // First batch: the two normal items before the oversized one
    expect(batches[0].items).toEqual([normal, normal]);
    expect(batches[0].startIndex).toBe(0);

    // Second batch: isolated oversized item
    expect(batches[1].items).toEqual([oversized]);
    expect(batches[1].startIndex).toBe(2);

    // Third batch: the normal item after oversized
    expect(batches[2].items).toEqual([normal]);
    expect(batches[2].startIndex).toBe(3);
  });

  it('auto-calculates batch size from item token distribution', async () => {
    // With large budget and small items, should batch many together
    const items = Array.from({ length: 20 }, (_, i) => `item-${i}`);
    const batches = await createBatches(items, { maxTokenBudget: 100_000 });

    // With 100k budget, outputRatio=2: inputBudget = 33333
    // Each item ~2 tokens, so optimal batch size should be large
    // All items should fit in one batch
    expect(batches.length).toBe(1);
    expect(batches[0].items.length).toBe(20);
  });

  it('handles non-string items via JSON serialization', async () => {
    const items = [{ key: 'value' }, { nested: { deep: true } }];
    const batches = await createBatches(items, { maxTokenBudget: 10_000 });

    expect(batches.length).toBe(1);
    expect(batches[0].items).toEqual(items);
  });

  it('uses model tokenizer when available', async () => {
    // Model with a tokenizer that counts words
    modelService.getModel.mockReturnValue({
      maxContextWindow: 128_000,
      maxOutputTokens: 8192,
      toTokens: (str) => str.split(/\s+/).filter(Boolean),
    });

    // Each item is 1 word = 1 token
    const items = ['alpha', 'beta', 'gamma', 'delta'];
    const batches = await createBatches(items, { batchSize: 2, maxTokenBudget: 10_000 });

    expect(batches.length).toBe(2);
    expect(batches[0].items).toEqual(['alpha', 'beta']);
    expect(batches[1].items).toEqual(['gamma', 'delta']);
  });
});
