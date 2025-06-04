import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fetch from 'node-fetch';
import modelService from './index.js';
import Model from './model.js';

import { run as chatgptRun } from '../../lib/chatgpt/index.js';

// Mock node-fetch before importing chatgpt
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

// Mock Redis
vi.mock('../../services/redis/index.js', () => ({
  getClient: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
  }),
}));

// Mock the prompt cache to avoid Redis dependencies
vi.mock('../../lib/prompt-cache/index.js', () => ({
  get: vi.fn().mockResolvedValue({ result: null }),
  set: vi.fn().mockResolvedValue('OK'),
}));

// Helper tokenizer
const tokenizer = (t) => t.split(' ');

describe('Global Override System', () => {
  beforeEach(() => {
    // Reset models and overrides before each test
    modelService.models = {};
    modelService.clearGlobalOverride(); // Clear all overrides
    modelService.bestPublicModelKey = 'fastGood';

    // Setup basic models for testing
    modelService.models = {
      fastGood: new Model({
        name: 'gpt-4-fast-good',
        maxContextWindow: 128000,
        maxOutputTokens: 16384,
        requestTimeout: 1000,
        apiUrl: 'https://api.openai.com',
        apiKey: 'test-key',
        endpoint: '/v1/chat/completions',
        tokenizer,
      }),
      fastCheap: new Model({
        name: 'gpt-4-fast-cheap',
        maxContextWindow: 128000,
        maxOutputTokens: 8192,
        requestTimeout: 1000,
        apiUrl: 'https://api.openai.com',
        apiKey: 'test-key',
        endpoint: '/v1/chat/completions',
        tokenizer,
      }),
      fastCheapReasoning: new Model({
        name: 'gpt-4-fast-cheap-reasoning',
        maxContextWindow: 200000,
        maxOutputTokens: 50000,
        requestTimeout: 3000,
        apiUrl: 'https://api.openai.com',
        apiKey: 'reasoning-key',
        endpoint: '/v1/chat/completions',
        tokenizer,
      }),
      customModel: new Model({
        name: 'custom-model-name',
        maxContextWindow: 64000,
        maxOutputTokens: 8192,
        requestTimeout: 2000,
        apiUrl: 'https://custom.api.com',
        apiKey: 'custom-key',
        endpoint: '/v1/completions',
        tokenizer,
      }),
      expensiveReasoning: new Model({
        name: 'gpt-4-reasoning',
        maxContextWindow: 200000,
        maxOutputTokens: 100000,
        requestTimeout: 5000,
        apiUrl: 'https://api.openai.com',
        apiKey: 'reasoning-key',
        endpoint: '/v1/chat/completions',
        tokenizer,
      }),
      fastReasoning: new Model({
        name: 'gpt-4-fast-reasoning',
        maxContextWindow: 200000,
        maxOutputTokens: 50000,
        requestTimeout: 3000,
        apiUrl: 'https://api.openai.com',
        apiKey: 'reasoning-key',
        endpoint: '/v1/chat/completions',
        tokenizer,
      }),
    };

    // Reset and setup fetch mock for each test
    vi.clearAllMocks();
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: 'Test response' } }],
        }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    modelService.clearGlobalOverride(); // Clean up after each test
  });

  describe('Global Override Management', () => {
    it('should set and get global overrides', () => {
      modelService.setGlobalOverride('modelName', 'customModel');
      modelService.setGlobalOverride('temperature', 0.8);

      expect(modelService.getGlobalOverride('modelName')).toBe('customModel');
      expect(modelService.getGlobalOverride('temperature')).toBe(0.8);
      expect(modelService.getGlobalOverride('maxTokens')).toBe(null);
    });

    it('should get all global overrides', () => {
      modelService.setGlobalOverride('modelName', 'customModel');
      modelService.setGlobalOverride('temperature', 0.8);

      const allOverrides = modelService.getAllGlobalOverrides();
      expect(allOverrides.modelName).toBe('customModel');
      expect(allOverrides.temperature).toBe(0.8);
      expect(allOverrides.maxTokens).toBe(null);
    });

    it('should clear specific global overrides', () => {
      modelService.setGlobalOverride('modelName', 'customModel');
      modelService.setGlobalOverride('temperature', 0.8);

      modelService.clearGlobalOverride('modelName');

      expect(modelService.getGlobalOverride('modelName')).toBe(null);
      expect(modelService.getGlobalOverride('temperature')).toBe(0.8);
    });

    it('should clear all global overrides', () => {
      modelService.setGlobalOverride('modelName', 'customModel');
      modelService.setGlobalOverride('temperature', 0.8);

      modelService.clearGlobalOverride();

      expect(modelService.getGlobalOverride('modelName')).toBe(null);
      expect(modelService.getGlobalOverride('temperature')).toBe(null);
    });

    it('should throw error for invalid override keys', () => {
      expect(() => {
        modelService.setGlobalOverride('invalidKey', 'value');
      }).toThrow('Invalid override key: invalidKey');

      expect(() => {
        modelService.clearGlobalOverride('invalidKey');
      }).toThrow('Invalid override key: invalidKey');
    });
  });

  describe('Model Name Override', () => {
    it('should override model selection globally', async () => {
      // Set global model override
      modelService.setGlobalOverride('modelName', 'customModel');

      const result = await chatgptRun('Test prompt', {
        modelOptions: {
          modelName: 'fastGood', // This should be overridden
        },
      });

      expect(result).toBe('Test response');
      expect(fetch).toHaveBeenCalledWith(
        'https://custom.api.com/v1/completions',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer custom-key',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"model":"custom-model-name"'),
        })
      );
    });

    it('should override even when no modelOptions provided', async () => {
      modelService.setGlobalOverride('modelName', 'expensiveReasoning');

      const result = await chatgptRun('Test prompt');

      expect(result).toBe('Test response');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer reasoning-key',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"model":"gpt-4-reasoning"'),
        })
      );
    });
  });

  describe('Negotiation Override', () => {
    it('should override negotiation options globally', async () => {
      modelService.setGlobalOverride('negotiate', { reasoning: true });

      const result = await chatgptRun('Test prompt', {
        modelOptions: {
          modelName: 'fastGood',
          negotiate: { fast: true, cheap: true }, // This should be overridden
        },
      });

      expect(result).toBe('Test response');
      // Should negotiate to reasoning model instead of fast+cheap
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          body: expect.stringContaining('"model":"gpt-4-fast-cheap-reasoning"'),
        })
      );
    });

    it('should apply negotiation when none provided in options', async () => {
      modelService.setGlobalOverride('negotiate', { fast: true, cheap: true });

      const result = await chatgptRun('Test prompt', {
        modelOptions: {
          modelName: 'expensiveReasoning', // Should be overridden by negotiation
        },
      });

      expect(result).toBe('Test response');
      // Should negotiate instead of using explicit model
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          body: expect.stringContaining('"model":"gpt-4-fast-cheap"'),
        })
      );
    });
  });

  describe('Parameter Overrides', () => {
    it('should override temperature globally', async () => {
      modelService.setGlobalOverride('temperature', 0.9);

      const result = await chatgptRun('Test prompt', {
        modelOptions: {
          modelName: 'fastGood',
          temperature: 0.1, // This should be overridden
        },
      });

      expect(result).toBe('Test response');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          body: expect.stringContaining('"temperature":0.9'),
        })
      );
    });

    it('should override multiple parameters', async () => {
      modelService.setGlobalOverride('temperature', 0.8);
      modelService.setGlobalOverride('maxTokens', 1500);
      modelService.setGlobalOverride('topP', 0.95);

      const result = await chatgptRun('Test prompt', {
        modelOptions: {
          modelName: 'fastGood',
          temperature: 0.1,
          maxTokens: 500,
          topP: 0.5,
        },
      });

      expect(result).toBe('Test response');

      const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(requestBody.temperature).toBe(0.8);
      expect(requestBody.max_tokens).toBe(1500);
      expect(requestBody.top_p).toBe(0.95);
    });

    it('should preserve non-overridden parameters', async () => {
      modelService.setGlobalOverride('temperature', 0.8);

      const result = await chatgptRun('Test prompt', {
        modelOptions: {
          modelName: 'fastGood',
          temperature: 0.1,
          maxTokens: 2000,
          topP: 0.7,
        },
      });

      expect(result).toBe('Test response');

      const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(requestBody.temperature).toBe(0.8); // Overridden
      expect(requestBody.max_tokens).toBe(2000); // Preserved
      expect(requestBody.top_p).toBe(0.7); // Preserved
    });
  });

  describe('Complex Override Scenarios', () => {
    it('should combine model and parameter overrides', async () => {
      modelService.setGlobalOverride('modelName', 'customModel');
      modelService.setGlobalOverride('temperature', 0.9);

      const result = await chatgptRun('Test prompt', {
        modelOptions: {
          modelName: 'fastGood',
          temperature: 0.1,
          maxTokens: 1000,
        },
      });

      expect(result).toBe('Test response');
      expect(fetch).toHaveBeenCalledWith(
        'https://custom.api.com/v1/completions',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer custom-key',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"temperature":0.9'),
        })
      );

      const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(requestBody.model).toBe('custom-model-name');
      expect(requestBody.max_tokens).toBe(1000); // Preserved
    });

    it('should handle override precedence correctly', async () => {
      // Set both model name and negotiation overrides
      modelService.setGlobalOverride('modelName', 'customModel');
      modelService.setGlobalOverride('negotiate', { reasoning: true });

      const result = await chatgptRun('Test prompt', {
        modelOptions: {
          modelName: 'fastGood',
        },
      });

      expect(result).toBe('Test response');
      // Negotiation should take precedence and override the model name
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          body: expect.stringContaining('"model":"gpt-4-fast-cheap-reasoning"'),
        })
      );
    });

    it('should work with empty modelOptions', async () => {
      modelService.setGlobalOverride('modelName', 'customModel');
      modelService.setGlobalOverride('temperature', 0.7);

      const result = await chatgptRun('Test prompt');

      expect(result).toBe('Test response');
      expect(fetch).toHaveBeenCalledWith(
        'https://custom.api.com/v1/completions',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer custom-key',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"temperature":0.7'),
        })
      );
    });
  });

  describe('Override Isolation', () => {
    it('should not affect subsequent calls after clearing overrides', async () => {
      // Set override and make a call
      modelService.setGlobalOverride('modelName', 'customModel');

      await chatgptRun('Test prompt 1');
      expect(fetch).toHaveBeenCalledWith(
        'https://custom.api.com/v1/completions',
        expect.anything()
      );

      // Clear override and make another call
      modelService.clearGlobalOverride('modelName');
      fetch.mockClear();

      await chatgptRun('Test prompt 2');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.anything()
      );
    });

    it('should apply overrides consistently across multiple calls', async () => {
      modelService.setGlobalOverride('temperature', 0.8);

      // First call
      await chatgptRun('Test prompt 1', {
        modelOptions: { modelName: 'fastGood', temperature: 0.1 },
      });

      // Second call
      await chatgptRun('Test prompt 2', {
        modelOptions: { modelName: 'customModel', temperature: 0.2 },
      });

      // Both calls should have temperature overridden to 0.8
      expect(fetch).toHaveBeenCalledTimes(2);

      const firstCall = JSON.parse(fetch.mock.calls[0][1].body);
      const secondCall = JSON.parse(fetch.mock.calls[1][1].body);

      expect(firstCall.temperature).toBe(0.8);
      expect(secondCall.temperature).toBe(0.8);
    });
  });
});
