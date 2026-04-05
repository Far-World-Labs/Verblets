import { describe, it, expect, vi, beforeEach } from 'vitest';
import centralTendency from './index.js';

// Mock the LLM service
vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
}));

import llm from '../../lib/llm/index.js';

describe('centralTendency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['empty string item', '', ['seed1', 'seed2'], 'Item must be a non-empty string'],
    ['null item', null, ['seed1', 'seed2'], 'Item must be a non-empty string'],
    ['empty seedItems array', 'item', [], 'seedItems must be a non-empty array'],
    ['null seedItems', 'item', null, 'seedItems must be a non-empty array'],
  ])('rejects %s', async (_label, item, seedItems, expectedError) => {
    await expect(centralTendency(item, seedItems)).rejects.toThrow(expectedError);
  });

  it('evaluates centrality with config object', async () => {
    const mockResponse = {
      score: 0.85,
      reason: 'High feature overlap with seed items',
      confidence: 0.9,
    };

    llm.mockResolvedValue(mockResponse);

    const result = await centralTendency('robin', ['sparrow', 'bluejay', 'cardinal'], {
      context: 'Evaluate based on typical bird characteristics',
      coreFeatures: ['feathers', 'beak', 'lays eggs'],
      llm: { fast: true, good: true, cheap: true },
    });

    expect(result).toEqual({
      score: 0.85,
      reason: 'High feature overlap with seed items',
      confidence: 0.9,
    });

    expect(llm).toHaveBeenCalledWith(
      expect.stringContaining('Evaluate how central "robin" is among these category members'),
      expect.objectContaining({
        llm: { fast: true, good: true, cheap: true },
      })
    );
  });

  it('builds correct prompt with context and core features', async () => {
    const mockResponse = {
      score: 0.7,
      reason: 'Test result',
      confidence: 0.8,
    };

    llm.mockResolvedValue(mockResponse);

    await centralTendency('robin', ['sparrow', 'bluejay'], {
      context: 'Bird evaluation context',
      coreFeatures: ['feathers', 'beak', 'flight'],
    });

    const calledPrompt = llm.mock.calls[0][0];
    expect(calledPrompt).toContain('Context: Bird evaluation context');
    expect(calledPrompt).toContain('Core Features: feathers, beak, flight');
    expect(calledPrompt).toContain('sparrow, bluejay');
  });
});
