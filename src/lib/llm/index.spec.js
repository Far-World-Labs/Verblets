import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

vi.mock('../prompt-cache/index.js', () => ({
  get: vi.fn().mockResolvedValue({ result: null }),
  set: vi.fn().mockResolvedValue(undefined),
}));

import fetch from 'node-fetch';
import { get as getPromptResult } from '../prompt-cache/index.js';
import callLlm, {
  jsonSchema,
  isSimpleCollectionSchema,
  isSimpleValueSchema,
  MODEL_KEYS,
} from './index.js';
import { nameStep } from '../option/index.js';
import { ModelService } from '../../services/llm-model/index.js';
import {
  TelemetryEvent,
  LlmStatus,
  Metric,
  TokenType,
  ModelSource,
} from '../progress/constants.js';

const mockFetch = fetch;
const testMs = new ModelService();

const makeApiResponse = (content, usage) => ({
  ok: true,
  status: 200,
  headers: { get: () => 'application/json' },
  json: async () => ({
    choices: [{ message: { content } }],
    usage: usage || { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  }),
});

describe('lib/llm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getPromptResult.mockResolvedValue({ result: null });
  });

  describe('re-exported response-format helpers', () => {
    it('jsonSchema wraps name and schema in standard envelope', () => {
      const result = jsonSchema('test_output', { type: 'object', properties: {} });
      expect(result).toEqual({
        type: 'json_schema',
        json_schema: {
          name: 'test_output',
          schema: { type: 'object', properties: {} },
        },
      });
    });

    it('isSimpleCollectionSchema detects single-items array wrapper', () => {
      const collection = jsonSchema('items_wrapper', {
        type: 'object',
        properties: { items: { type: 'array', items: { type: 'string' } } },
      });
      expect(isSimpleCollectionSchema(collection)).toBe(true);
    });

    it('isSimpleCollectionSchema rejects multi-property schemas', () => {
      const multi = jsonSchema('multi', {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'string' } },
          count: { type: 'number' },
        },
      });
      expect(isSimpleCollectionSchema(multi)).toBe(false);
    });

    it('isSimpleValueSchema detects single-value wrapper', () => {
      const value = jsonSchema('value_wrapper', {
        type: 'object',
        properties: { value: { type: 'string' } },
      });
      expect(isSimpleValueSchema(value)).toBe(true);
    });

    it('isSimpleValueSchema rejects non-value schemas', () => {
      const other = jsonSchema('other', {
        type: 'object',
        properties: { result: { type: 'string' } },
      });
      expect(isSimpleValueSchema(other)).toBe(false);
    });
  });

  describe('getOption integration — policy-driven model parameters', () => {
    it('resolves temperature from policy function', async () => {
      mockFetch.mockResolvedValueOnce(makeApiResponse('result'));

      const config = nameStep('test-chain', {
        modelService: testMs,
        policy: {
          temperature: ({ operation }) => (operation === 'test-chain' ? 0.1 : 0.9),
        },
      });

      await callLlm('prompt', config);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.temperature).toBe(0.1);
    });

    it('resolves temperature from direct config when no policy', async () => {
      mockFetch.mockResolvedValueOnce(makeApiResponse('result'));

      const config = nameStep('chain', {
        modelService: testMs,
        temperature: 0.3,
      });

      await callLlm('prompt', config);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.temperature).toBe(0.3);
    });

    it('resolves responseFormat through getOption', async () => {
      const format = jsonSchema('test_schema', {
        type: 'object',
        properties: { value: { type: 'string' } },
      });

      mockFetch.mockResolvedValueOnce(makeApiResponse(JSON.stringify({ value: 'hello' })));

      const config = nameStep('chain', {
        modelService: testMs,
        responseFormat: format,
      });

      const result = await callLlm('prompt', config);
      expect(result).toBe('hello');
    });

    it('policy temperature overrides direct config', async () => {
      mockFetch.mockResolvedValueOnce(makeApiResponse('result'));

      const config = nameStep('chain', {
        modelService: testMs,
        temperature: 0.9,
        policy: { temperature: () => 0.1 },
      });

      await callLlm('prompt', config);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.temperature).toBe(0.1);
    });
  });

  describe('progress emitter integration', () => {
    it('emits llm:model telemetry event', async () => {
      const events = [];
      mockFetch.mockResolvedValueOnce(makeApiResponse('result'));

      const config = nameStep('chain', {
        modelService: testMs,
        onProgress: (e) => events.push(e),
      });

      await callLlm('prompt', config);

      const modelEvent = events.find((e) => e.event === TelemetryEvent.llmModel);
      expect(modelEvent).toBeDefined();
      expect(modelEvent.source).toBe(ModelSource.default);
      expect(modelEvent).toHaveProperty('model');
    });

    it('emits llm:call success telemetry with token metrics', async () => {
      const events = [];
      mockFetch.mockResolvedValueOnce(
        makeApiResponse('result', { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 })
      );

      const config = nameStep('chain', {
        modelService: testMs,
        onProgress: (e) => events.push(e),
      });

      await callLlm('prompt', config);

      const callEvent = events.find((e) => e.event === TelemetryEvent.llmCall);
      expect(callEvent).toBeDefined();
      expect(callEvent.status).toBe(LlmStatus.success);

      const tokenEvents = events.filter((e) => e.metric === Metric.tokenUsage);
      expect(tokenEvents).toHaveLength(2);

      const inputTokens = tokenEvents.find((e) => e.tokenType === TokenType.input);
      expect(inputTokens.value).toBe(20);

      const outputTokens = tokenEvents.find((e) => e.tokenType === TokenType.output);
      expect(outputTokens.value).toBe(10);
    });

    it('emits llm:call error telemetry on failure', async () => {
      const events = [];
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: { get: () => 'application/json' },
        json: async () => ({ error: { message: 'Internal error', type: 'server_error' } }),
      });

      const config = nameStep('chain', {
        modelService: testMs,
        onProgress: (e) => events.push(e),
      });

      await expect(callLlm('prompt', config)).rejects.toThrow('Internal error');

      const callEvent = events.find((e) => e.event === TelemetryEvent.llmCall);
      expect(callEvent).toBeDefined();
      expect(callEvent.status).toBe(LlmStatus.error);
      expect(callEvent.error.message).toContain('Internal error');
    });

    it('emits duration metric on success', async () => {
      const events = [];
      mockFetch.mockResolvedValueOnce(makeApiResponse('result'));

      const config = nameStep('chain', {
        modelService: testMs,
        onProgress: (e) => events.push(e),
      });

      await callLlm('prompt', config);

      const duration = events.find((e) => e.metric === Metric.llmDuration);
      expect(duration).toBeDefined();
      expect(typeof duration.value).toBe('number');
      expect(duration.value).toBeGreaterThanOrEqual(0);
    });

    it('silently operates when onProgress is undefined', async () => {
      mockFetch.mockResolvedValueOnce(makeApiResponse('result'));

      const config = nameStep('chain', { modelService: testMs });

      await expect(callLlm('prompt', config)).resolves.toBe('result');
    });
  });

  describe('MODEL_KEYS export', () => {
    it('includes all standard model parameter keys', () => {
      expect(MODEL_KEYS).toContain('responseFormat');
      expect(MODEL_KEYS).toContain('temperature');
      expect(MODEL_KEYS).toContain('maxTokens');
      expect(MODEL_KEYS).toContain('systemPrompt');
      expect(MODEL_KEYS).toContain('tools');
    });
  });
});
