import { describe, it, expect, vi, beforeEach } from 'vitest';
import centralTendency from './index.js';

// Mock the LLM service
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(),
}));

import chatGPT from '../../lib/chatgpt/index.js';

describe('centralTendency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('evaluates centrality with config object', async () => {
    const mockResponse = {
      score: 0.85,
      reason: 'High feature overlap with seed items',
      confidence: 0.9,
    };

    chatGPT.mockResolvedValue(mockResponse);

    const result = await centralTendency('robin', ['sparrow', 'bluejay', 'cardinal'], {
      context: 'Evaluate based on typical bird characteristics',
      coreFeatures: ['feathers', 'beak', 'lays eggs'],
      llm: 'fastGoodCheap',
    });

    expect(result).toEqual({
      score: 0.85,
      reason: 'High feature overlap with seed items',
      confidence: 0.9,
    });

    expect(chatGPT).toHaveBeenCalledWith(
      expect.stringContaining('Evaluate how central "robin" is among these category members'),
      { modelOptions: expect.objectContaining({ modelName: 'fastGoodCheap' }) }
    );
  });

  it('uses default LLM model when not specified', async () => {
    const mockResponse = {
      score: 0.75,
      reason: 'Good match',
      confidence: 0.8,
    };

    chatGPT.mockResolvedValue(mockResponse);

    const result = await centralTendency('penguin', ['robin', 'sparrow'], {
      context: 'Bird evaluation',
    });

    expect(result.score).toBe(0.75);
    expect(chatGPT).toHaveBeenCalledWith(expect.any(String), {
      modelOptions: expect.objectContaining({ modelName: 'fastGoodCheap' }),
    });
  });

  it('throws error for invalid item', async () => {
    await expect(centralTendency('', ['seed1', 'seed2'])).rejects.toThrow(
      'Item must be a non-empty string'
    );
    await expect(centralTendency(null, ['seed1', 'seed2'])).rejects.toThrow(
      'Item must be a non-empty string'
    );
  });

  it('throws error for invalid seedItems', async () => {
    await expect(centralTendency('item', [])).rejects.toThrow(
      'seedItems must be a non-empty array'
    );
    await expect(centralTendency('item', null)).rejects.toThrow(
      'seedItems must be a non-empty array'
    );
  });

  it('handles parsed response from chatGPT', async () => {
    const mockResponse = {
      score: 0.6,
      reason: 'Moderate centrality',
      confidence: 0.7,
    };

    chatGPT.mockResolvedValue(mockResponse);

    const result = await centralTendency('item', ['seed1', 'seed2']);

    expect(result).toEqual({
      score: 0.6,
      reason: 'Moderate centrality',
      confidence: 0.7,
    });
  });

  it('handles object response directly', async () => {
    const mockResponse = {
      score: 0.8,
      reason: 'High centrality',
      confidence: 0.9,
    };

    chatGPT.mockResolvedValue(mockResponse);

    const result = await centralTendency('item', ['seed1', 'seed2']);

    expect(result).toEqual(mockResponse);
  });

  it('builds correct prompt with context and core features', async () => {
    const mockResponse = {
      score: 0.7,
      reason: 'Test result',
      confidence: 0.8,
    };

    chatGPT.mockResolvedValue(mockResponse);

    await centralTendency('robin', ['sparrow', 'bluejay'], {
      context: 'Bird evaluation context',
      coreFeatures: ['feathers', 'beak', 'flight'],
    });

    const calledPrompt = chatGPT.mock.calls[0][0];
    expect(calledPrompt).toContain('Context: Bird evaluation context');
    expect(calledPrompt).toContain('Core Features: feathers, beak, flight');
    expect(calledPrompt).toContain('sparrow, bluejay');
  });

  it('uses JSON schema validation', async () => {
    const mockResponse = {
      score: 0.6,
      reason: 'Assessment with schema',
      confidence: 0.8,
    };

    chatGPT.mockResolvedValue(mockResponse);

    await centralTendency('item', ['seed1', 'seed2'], {});

    const modelOptions = chatGPT.mock.calls[0][1].modelOptions;
    expect(modelOptions).toHaveProperty('response_format');
    expect(modelOptions.response_format.type).toBe('json_schema');
    expect(modelOptions.response_format.json_schema.name).toBe('central_tendency_result');
  });
});
