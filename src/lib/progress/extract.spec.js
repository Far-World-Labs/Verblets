import { describe, it, expect } from 'vitest';
import {
  extractLLMConfig,
  extractPromptAnalysis,
  extractResultValue,
  extractBatchConfig,
} from './extract.js';

describe('extractLLMConfig', () => {
  it('returns hasLlmConfig: false for falsy input', () => {
    expect(extractLLMConfig(undefined)).toEqual({ hasLlmConfig: false });
    expect(extractLLMConfig(null)).toEqual({ hasLlmConfig: false });
  });

  it('extracts model, temperature, maxTokens, responseFormat', () => {
    const result = extractLLMConfig({
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: 'json_schema' },
    });

    expect(result).toEqual({
      hasLlmConfig: true,
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 1024,
      responseFormat: 'json_schema',
    });
  });

  it('omits undefined fields', () => {
    const result = extractLLMConfig({ model: 'claude-sonnet' });

    expect(result).toEqual({
      hasLlmConfig: true,
      model: 'claude-sonnet',
    });
    expect(result).not.toHaveProperty('temperature');
    expect(result).not.toHaveProperty('maxTokens');
    expect(result).not.toHaveProperty('responseFormat');
  });

  it('includes temperature when explicitly 0', () => {
    const result = extractLLMConfig({ temperature: 0 });

    expect(result.temperature).toBe(0);
  });

  it('returns only hasLlmConfig for empty object', () => {
    expect(extractLLMConfig({})).toEqual({ hasLlmConfig: true });
  });
});

describe('extractPromptAnalysis', () => {
  it('analyzes string prompts', () => {
    const result = extractPromptAnalysis('Hello world');

    expect(result).toEqual({
      promptLength: 11,
      promptType: 'string',
    });
  });

  it('analyzes messages arrays', () => {
    const messages = [
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'Hi' },
    ];
    const result = extractPromptAnalysis(messages);

    expect(result).toEqual({
      promptLength: 17, // 15 + 2
      promptType: 'messages',
      messageTypes: ['system', 'user'],
      messageCount: 2,
    });
  });

  it('handles messages with missing content', () => {
    const messages = [{ role: 'user' }];
    const result = extractPromptAnalysis(messages);

    expect(result.promptLength).toBe(0);
    expect(result.messageCount).toBe(1);
  });

  it('handles messages with missing role', () => {
    const messages = [{ content: 'orphan' }];
    const result = extractPromptAnalysis(messages);

    expect(result.messageTypes).toEqual([]);
  });

  it('analyzes object prompts with system and user', () => {
    const result = extractPromptAnalysis({
      system: 'Be helpful',
      user: 'Hi',
    });

    expect(result).toEqual({
      promptType: 'object',
      systemPromptLength: 10,
      userPromptLength: 2,
      promptLength: 12,
    });
  });

  it('analyzes object prompts with only system', () => {
    const result = extractPromptAnalysis({ system: 'Instructions' });

    expect(result).toEqual({
      promptType: 'object',
      systemPromptLength: 12,
      promptLength: 12,
    });
  });

  it('returns unknown for non-standard types', () => {
    expect(extractPromptAnalysis(42)).toEqual({ promptType: 'unknown' });
    expect(extractPromptAnalysis(true)).toEqual({ promptType: 'unknown' });
  });

  it('handles object with no prompt fields', () => {
    const result = extractPromptAnalysis({ foo: 'bar' });

    expect(result).toEqual({ promptType: 'object' });
    expect(result).not.toHaveProperty('promptLength');
  });
});

describe('extractResultValue', () => {
  it('returns raw and resolved values', () => {
    expect(extractResultValue('raw', 'resolved')).toEqual({
      rawValue: 'raw',
      value: 'resolved',
    });
  });

  it('handles undefined values', () => {
    expect(extractResultValue(undefined, undefined)).toEqual({
      rawValue: undefined,
      value: undefined,
    });
  });
});

describe('extractBatchConfig', () => {
  it('extracts all batch properties', () => {
    const result = extractBatchConfig({
      batchSize: 10,
      maxAttempts: 3,
      maxParallel: 5,
      totalItems: 100,
      totalBatches: 10,
      retryCount: 1,
      failedItems: 2,
    });

    expect(result).toEqual({
      batchSize: 10,
      maxAttempts: 3,
      maxParallel: 5,
      totalItems: 100,
      totalBatches: 10,
      retryCount: 1,
      failedItems: 2,
    });
  });

  it('leaves missing properties as undefined', () => {
    const result = extractBatchConfig({ totalItems: 50 });

    expect(result.totalItems).toBe(50);
    expect(result.batchSize).toBeUndefined();
    expect(result.maxAttempts).toBeUndefined();
  });

  it('ignores extra properties', () => {
    const result = extractBatchConfig({
      totalItems: 10,
      extraField: 'ignored',
      anotherOne: true,
    });

    expect(Object.keys(result)).toEqual([
      'batchSize',
      'maxAttempts',
      'maxParallel',
      'totalItems',
      'totalBatches',
      'retryCount',
      'failedItems',
    ]);
    expect(result).not.toHaveProperty('extraField');
  });
});
