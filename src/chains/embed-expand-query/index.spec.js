import { describe, it, expect, vi, beforeEach } from 'vitest';
import embedExpandQuery, { ALL_STRATEGIES } from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
}));

const { default: mockLlm } = await import('../../lib/llm/index.js');

beforeEach(() => {
  mockLlm.mockReset();
});

// The 4 verblets each call mockLlm once. We set up responses in call order.
// Strategy order follows ALL_STRATEGIES: rewrite, multi, stepBack, subquestions.

describe('embedExpandQuery', () => {
  it('runs all 4 strategies by default and returns deduplicated results', async () => {
    mockLlm
      .mockResolvedValueOnce('rewritten query about plants')
      .mockResolvedValueOnce(['multi variant A', 'multi variant B'])
      .mockResolvedValueOnce(['stepback question 1', 'stepback question 2'])
      .mockResolvedValueOnce(['sub-q 1', 'sub-q 2']);

    const result = await embedExpandQuery('how do plants make food');

    expect(mockLlm).toHaveBeenCalledTimes(4);
    expect(result[0]).toBe('how do plants make food');
    expect(result).toContain('rewritten query about plants');
    expect(result).toContain('multi variant A');
    expect(result).toContain('multi variant B');
    expect(result).toContain('stepback question 1');
    expect(result).toContain('stepback question 2');
    expect(result).toContain('sub-q 1');
    expect(result).toContain('sub-q 2');
    expect(result).toHaveLength(8);
  });

  it('selects a single strategy', async () => {
    mockLlm.mockResolvedValueOnce(['variant A', 'variant B']);

    const result = await embedExpandQuery('test query', {
      strategies: ['multi'],
    });

    expect(mockLlm).toHaveBeenCalledTimes(1);
    expect(result[0]).toBe('test query');
    expect(result).toContain('variant A');
    expect(result).toContain('variant B');
    expect(result).toHaveLength(3);
  });

  it('always includes original query first', async () => {
    mockLlm.mockResolvedValueOnce('rewritten');

    const result = await embedExpandQuery('original', {
      strategies: ['rewrite'],
    });

    expect(result[0]).toBe('original');
    expect(result[1]).toBe('rewritten');
  });

  it('deduplicates results including when a strategy returns the original', async () => {
    mockLlm
      .mockResolvedValueOnce('how do plants make food')
      .mockResolvedValueOnce(['unique variant', 'how do plants make food']);

    const result = await embedExpandQuery('how do plants make food', {
      strategies: ['rewrite', 'multi'],
    });

    expect(result[0]).toBe('how do plants make food');
    const dupes = result.filter((q) => q === 'how do plants make food');
    expect(dupes).toHaveLength(1);
    expect(result).toContain('unique variant');
  });

  it('forwards llm and logger config to verblets', async () => {
    const logger = { info: vi.fn() };
    mockLlm.mockResolvedValueOnce('rewritten');

    await embedExpandQuery('test', {
      strategies: ['rewrite'],
      llm: { modelName: 'test-model' },
      logger,
    });

    const callConfig = mockLlm.mock.calls[0][1];
    expect(callConfig.modelOptions.modelName).toBe('test-model');
    expect(callConfig.logger).toBe(logger);
  });

  it('forwards count to multi and stepBack strategies', async () => {
    mockLlm
      .mockResolvedValueOnce(['a', 'b', 'c', 'd', 'e'])
      .mockResolvedValueOnce(['x', 'y', 'z', 'w', 'v']);

    await embedExpandQuery('test', {
      strategies: ['multi', 'stepBack'],
      count: 5,
    });

    const multiPrompt = mockLlm.mock.calls[0][0];
    expect(multiPrompt).toContain('5');

    const stepBackPrompt = mockLlm.mock.calls[1][0];
    expect(stepBackPrompt).toContain('5');
  });

  it('exports ALL_STRATEGIES constant', () => {
    expect(ALL_STRATEGIES).toEqual(['rewrite', 'multi', 'stepBack', 'subquestions']);
  });
});
