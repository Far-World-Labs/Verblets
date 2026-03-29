import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock node-fetch before importing llm
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

// Mock Redis (disable caching)
vi.mock('../../services/redis/index.js', () => ({
  getClient: vi.fn().mockResolvedValue(null),
}));

// Mock prompt cache
vi.mock('../prompt-cache/index.js', () => ({
  get: vi.fn().mockResolvedValue({ result: null }),
  set: vi.fn().mockResolvedValue(undefined),
}));

import fetch from 'node-fetch';
import { get as getPromptResult, set as setPromptResult } from '../prompt-cache/index.js';
import callLlm from './index.js';
import retry from '../retry/index.js';
import { nameStep, getOptionDetail } from '../context/option.js';
import createProgressEmitter from '../progress/index.js';
import {
  Kind,
  ChainEvent,
  TelemetryEvent,
  DomainEvent,
  OpEvent,
  LlmStatus,
  OptionSource,
  Metric,
  TokenType,
} from '../progress/constants.js';

const mockFetch = fetch;

const makeApiResponse = (content, usage) => ({
  ok: true,
  status: 200,
  headers: { get: () => 'application/json' },
  json: async () => ({
    choices: [{ message: { content } }],
    usage: usage || { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  }),
});

const makeErrorResponse = (status, errorType, errorMessage) => ({
  ok: false,
  status,
  headers: { get: () => 'application/json' },
  json: async () => ({
    error: { type: errorType, message: errorMessage },
  }),
});

describe('Telemetry events', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Restore prompt-cache mocks cleared by resetAllMocks
    getPromptResult.mockResolvedValue({ result: null });
    setPromptResult.mockResolvedValue(undefined);
  });

  describe('callLlm telemetry', () => {
    it('emits llm:model event with model selection', async () => {
      const events = [];
      mockFetch.mockResolvedValueOnce(makeApiResponse('hello'));

      await callLlm('test prompt', {
        onProgress: (e) => events.push(e),
        operation: 'test-chain',
      });

      const modelEvents = events.filter((e) => e.event === DomainEvent.llmModel);
      expect(modelEvents).toHaveLength(1);
      expect(modelEvents[0]).toMatchObject({
        kind: Kind.event,
        step: 'llm',
        event: DomainEvent.llmModel,
        operation: 'test-chain',
        source: expect.stringMatching(/^(negotiated|config|default)$/),
      });
    });

    it('emits llm:call success telemetry with tokens and duration', async () => {
      const events = [];
      mockFetch.mockResolvedValueOnce(
        makeApiResponse('result text', {
          prompt_tokens: 20,
          completion_tokens: 10,
          total_tokens: 30,
        })
      );

      await callLlm('test prompt', {
        onProgress: (e) => events.push(e),
        operation: 'filter',
      });

      const callEvents = events.filter((e) => e.event === TelemetryEvent.llmCall);
      expect(callEvents).toHaveLength(1);
      expect(callEvents[0]).toMatchObject({
        kind: Kind.telemetry,
        step: 'llm',
        event: TelemetryEvent.llmCall,
        operation: 'filter',
        status: LlmStatus.success,
        cached: false,
      });

      // Token usage emitted as flat dimensional metrics
      const tokenEvents = events.filter((e) => e.metric === Metric.tokenUsage);
      expect(tokenEvents).toHaveLength(2);
      expect(tokenEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            metric: Metric.tokenUsage,
            tokenType: TokenType.input,
            value: 20,
          }),
          expect.objectContaining({
            metric: Metric.tokenUsage,
            tokenType: TokenType.output,
            value: 10,
          }),
        ])
      );

      // Duration emitted as flat dimensional metric
      const durationEvents = events.filter((e) => e.metric === Metric.llmDuration);
      expect(durationEvents).toHaveLength(1);
      expect(durationEvents[0].value).toBeGreaterThanOrEqual(0);
    });

    it('emits llm:call error telemetry with httpStatus on rate limit', async () => {
      const events = [];
      mockFetch.mockResolvedValueOnce(
        makeErrorResponse(429, 'rate_limit_error', 'Rate limit exceeded')
      );

      await expect(
        callLlm('test prompt', {
          onProgress: (e) => events.push(e),
          operation: 'score',
        })
      ).rejects.toThrow();

      const callEvents = events.filter((e) => e.event === TelemetryEvent.llmCall);
      expect(callEvents).toHaveLength(1);
      expect(callEvents[0]).toMatchObject({
        kind: Kind.telemetry,
        step: 'llm',
        event: TelemetryEvent.llmCall,
        operation: 'score',
        status: LlmStatus.error,
        error: {
          httpStatusCode: 429,
          type: 'rate_limit_error',
        },
      });
      expect(callEvents[0].error.message).toContain('Rate limit exceeded');

      // Duration emitted as flat metric even on error
      const durationEvents = events.filter((e) => e.metric === Metric.llmDuration);
      expect(durationEvents).toHaveLength(1);
      expect(typeof durationEvents[0].value).toBe('number');
    });

    it('emits llm:call error telemetry on non-JSON response', async () => {
      const events = [];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'text/html' },
        text: async () => '<html>Bad Gateway</html>',
      });

      await expect(
        callLlm('test prompt', {
          onProgress: (e) => events.push(e),
          operation: 'map',
        })
      ).rejects.toThrow('expected JSON');

      const callEvents = events.filter((e) => e.event === TelemetryEvent.llmCall);
      expect(callEvents).toHaveLength(1);
      expect(callEvents[0]).toMatchObject({
        kind: Kind.telemetry,
        status: LlmStatus.error,
        error: { httpStatusCode: 200 },
      });
    });

    it('does not emit events when onProgress is absent', async () => {
      mockFetch.mockResolvedValueOnce(makeApiResponse('hello'));

      // Should not throw — emitProgress handles undefined callback
      await callLlm('test prompt', {});
    });

    it('error still propagates after telemetry emission', async () => {
      mockFetch.mockResolvedValueOnce(
        makeErrorResponse(500, 'server_error', 'Internal server error')
      );

      await expect(
        callLlm('test prompt', {
          onProgress: vi.fn(),
        })
      ).rejects.toThrow('Internal server error');
    });

    it('includes operation in llm:model event', async () => {
      const events = [];
      mockFetch.mockResolvedValueOnce(makeApiResponse('hello'));

      await callLlm('test prompt', {
        onProgress: (e) => events.push(e),
        operation: 'test',
      });

      const modelEvent = events.find((e) => e.event === DomainEvent.llmModel);
      expect(modelEvent.operation).toBe('test');
    });

    it('includes negotiation in model event when capabilities used', async () => {
      const events = [];
      mockFetch.mockResolvedValueOnce(makeApiResponse('hello'));

      await callLlm('test prompt', {
        onProgress: (e) => events.push(e),
        fast: true,
        good: true,
      });

      const modelEvent = events.find((e) => e.event === DomainEvent.llmModel);
      expect(modelEvent.source).toBe('negotiated');
      expect(modelEvent.negotiation).toBeDefined();
      expect(modelEvent.negotiation.fast).toBe(true);
    });
  });

  describe('createProgressEmitter telemetry', () => {
    it('emits chain:start telemetry event', () => {
      const events = [];
      const config = {
        onProgress: (e) => events.push(e),
        operation: 'parent',
      };

      const runConfig = nameStep('filter', config);
      const emitter = createProgressEmitter('filter', runConfig.onProgress, runConfig);
      emitter.start();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        kind: Kind.event,
        step: 'filter',
        event: ChainEvent.start,
        operation: 'parent/filter',
      });
    });

    it('emits chain:start with top-level operation when no parent', () => {
      const events = [];
      const runConfig = nameStep('score', { onProgress: (e) => events.push(e) });
      const emitter = createProgressEmitter('score', runConfig.onProgress, runConfig);
      emitter.start();

      expect(events[0]).toMatchObject({
        kind: Kind.event,
        step: 'score',
        event: ChainEvent.start,
        operation: 'score',
      });
    });

    it('does not emit when onProgress absent', () => {
      // Should not throw
      const runConfig = nameStep('filter', {});
      const emitter = createProgressEmitter('filter', runConfig.onProgress, runConfig);
      emitter.start();
    });
  });

  describe('retry telemetry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('emits retry:attempt on each attempt', async () => {
      const events = [];
      const fn = vi.fn().mockResolvedValue('ok');

      const promise = retry(fn, {
        label: 'test-retry',
        config: {
          onProgress: (e) => events.push(e),
          operation: 'filter',
        },
        retryDelay: 10,
      });
      await vi.runAllTimersAsync();
      await promise;

      const attemptEvents = events.filter((e) => e.event === OpEvent.retryAttempt);
      expect(attemptEvents).toHaveLength(1);
      expect(attemptEvents[0]).toMatchObject({
        kind: Kind.operation,
        step: 'test-retry',
        event: OpEvent.retryAttempt,
        operation: 'filter',
        attemptNumber: 1,
      });
    });

    it('emits retry:error on retryable failure with structured error', async () => {
      const events = [];
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          const err = new Error('Too many requests');
          err.response = { status: 429 };
          err.httpStatus = 429;
          err.errorType = 'rate_limit_error';
          throw err;
        }
        return 'ok';
      };

      const promise = retry(fn, {
        label: 'llm-call',
        config: {
          onProgress: (e) => events.push(e),
          operation: 'score',
        },
        retryDelay: 10,
      });
      await vi.runAllTimersAsync();
      await promise;

      const errorEvents = events.filter((e) => e.event === OpEvent.retryError);
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0]).toMatchObject({
        kind: Kind.operation,
        step: 'llm-call',
        event: OpEvent.retryError,
        operation: 'score',
        attemptNumber: 1,
        error: {
          message: 'Too many requests',
          httpStatus: 429,
          type: 'rate_limit_error',
        },
      });
      // Delay emitted as flat dimensional metric
      const delayEvents = events.filter((e) => e.metric === Metric.retryDelay);
      expect(delayEvents).toHaveLength(1);
      expect(typeof delayEvents[0].value).toBe('number');
    });

    it('emits retry:exhaust on final failure', async () => {
      const events = [];
      const fn = vi.fn().mockImplementation(async () => {
        const err = new Error('Server error');
        err.response = { status: 500 };
        err.httpStatus = 500;
        throw err;
      });

      const promise = retry(fn, {
        label: 'failing',
        maxAttempts: 2,
        config: {
          onProgress: (e) => events.push(e),
          operation: 'reduce',
        },
        retryDelay: 10,
      });
      // Attach catch handler before advancing timers to avoid unhandled rejection
      const settled = promise.catch(() => {});
      await vi.runAllTimersAsync();
      await settled;
      await expect(promise).rejects.toThrow('Server error');

      const exhaustEvents = events.filter((e) => e.event === OpEvent.retryExhaust);
      expect(exhaustEvents).toHaveLength(1);
      expect(exhaustEvents[0]).toMatchObject({
        kind: Kind.operation,
        step: 'failing',
        event: OpEvent.retryExhaust,
        operation: 'reduce',
        error: { message: 'Server error', httpStatus: 500 },
      });
    });

    it('emits multiple retry:attempt events across retries', async () => {
      const events = [];
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount <= 2) {
          const err = new Error('Retry me');
          err.response = { status: 429 };
          throw err;
        }
        return 'ok';
      };

      const promise = retry(fn, {
        label: 'multi',
        maxAttempts: 3,
        config: { onProgress: (e) => events.push(e) },
        retryDelay: 10,
      });
      await vi.runAllTimersAsync();
      await promise;

      const attemptEvents = events.filter((e) => e.event === OpEvent.retryAttempt);
      expect(attemptEvents).toHaveLength(3);
      expect(attemptEvents[0].attemptNumber).toBe(1);
      expect(attemptEvents[1].attemptNumber).toBe(2);
      expect(attemptEvents[2].attemptNumber).toBe(3);
    });
  });

  describe('getOptionDetail telemetry', () => {
    it('emits option:resolve telemetry with source and value', async () => {
      const events = [];
      const config = {
        onProgress: (e) => events.push(e),
        operation: 'filter',
        temperature: 0.7,
      };

      const { value } = await getOptionDetail('temperature', config, 0.5);

      expect(value).toBe(0.7);
      const resolveEvents = events.filter((e) => e.event === DomainEvent.optionResolve);
      expect(resolveEvents).toHaveLength(1);
      expect(resolveEvents[0]).toMatchObject({
        kind: Kind.event,
        step: 'temperature',
        event: DomainEvent.optionResolve,
        operation: 'filter',
        source: OptionSource.config,
        value: 0.7,
      });
    });

    it('emits option:resolve with fallback source', async () => {
      const events = [];
      const config = {
        onProgress: (e) => events.push(e),
        operation: 'score',
      };

      const { value } = await getOptionDetail('temperature', config, 0.5);

      expect(value).toBe(0.5);
      const resolveEvents = events.filter((e) => e.event === DomainEvent.optionResolve);
      expect(resolveEvents[0]).toMatchObject({
        source: OptionSource.fallback,
        value: 0.5,
      });
    });

    it('emits option:resolve with policy source', async () => {
      const events = [];
      const config = {
        onProgress: (e) => events.push(e),
        operation: 'map',
        policy: { temperature: () => 0.9 },
      };

      const { value } = await getOptionDetail('temperature', config, 0.5);

      expect(value).toBe(0.9);
      const resolveEvents = events.filter((e) => e.event === DomainEvent.optionResolve);
      expect(resolveEvents[0]).toMatchObject({
        source: OptionSource.policy,
        value: 0.9,
        policyReturned: 0.9,
      });
    });

    it('does not emit when onProgress absent', async () => {
      // Should not throw
      await getOptionDetail('temperature', {}, 0.5);
    });
  });

  describe('prompt trace', () => {
    it('does not emit prompt:trace when promptTrace is falsy', async () => {
      const events = [];
      mockFetch.mockResolvedValueOnce(makeApiResponse('hello'));

      await callLlm('test prompt', {
        onProgress: (e) => events.push(e),
        operation: 'test',
      });

      const traceEvents = events.filter((e) => e.event === DomainEvent.promptTrace);
      expect(traceEvents).toHaveLength(0);
    });

    it('emits prompt:trace on success when promptTrace is enabled', async () => {
      const events = [];
      mockFetch.mockResolvedValueOnce(makeApiResponse('hello world'));

      await callLlm('test prompt', {
        onProgress: (e) => events.push(e),
        operation: 'test',
        promptTrace: true,
      });

      const traceEvents = events.filter((e) => e.event === DomainEvent.promptTrace);
      expect(traceEvents).toHaveLength(1);
      expect(traceEvents[0]).toMatchObject({
        kind: Kind.event,
        event: DomainEvent.promptTrace,
        level: 'debug',
        cached: false,
      });
      expect(traceEvents[0].provider).toBeDefined();
      expect(traceEvents[0].message).toMatch(/^LLM (cache hit|call): /);
      // Without content store, prompt/response are inline (short strings)
      expect(traceEvents[0].prompt).toBe('test prompt');
      expect(traceEvents[0].response).toBe('hello world');
    });

    it('emits prompt:trace on error when promptTrace is enabled', async () => {
      const events = [];
      mockFetch.mockResolvedValueOnce(
        makeErrorResponse(500, 'server_error', 'Internal server error')
      );

      await expect(
        callLlm('failing prompt', {
          onProgress: (e) => events.push(e),
          operation: 'test',
          promptTrace: true,
        })
      ).rejects.toThrow();

      const traceEvents = events.filter((e) => e.event === DomainEvent.promptTrace);
      expect(traceEvents).toHaveLength(1);
      expect(traceEvents[0]).toMatchObject({
        kind: Kind.event,
        event: DomainEvent.promptTrace,
        level: 'debug',
        cached: false,
        error: {
          message: expect.stringContaining('Internal server error'),
          httpStatus: 500,
          type: 'server_error',
        },
      });
      expect(traceEvents[0].prompt).toBe('failing prompt');
      expect(traceEvents[0].response).toBeUndefined();
    });

    it('uses content store for large payloads', async () => {
      const events = [];
      const stored = new Map();
      const contentStore = {
        async get(key) { return stored.get(key); },
        async set(key, value) { stored.set(key, value); },
        async has(key) { return stored.has(key); },
        async delete(key) { return stored.delete(key); },
        size() { return stored.size; },
        clear() { stored.clear(); },
      };

      const longPrompt = 'x'.repeat(1000);
      mockFetch.mockResolvedValueOnce(makeApiResponse('short response'));

      await callLlm(longPrompt, {
        onProgress: (e) => events.push(e),
        operation: 'test',
        promptTrace: true,
        contentStore,
      });

      const traceEvents = events.filter((e) => e.event === DomainEvent.promptTrace);
      expect(traceEvents).toHaveLength(1);

      // Prompt stored via content store — event has $ref
      expect(traceEvents[0].prompt).toHaveProperty('$ref');
      const storedPrompt = await contentStore.get(traceEvents[0].prompt.$ref);
      expect(storedPrompt).toBe(longPrompt);

      // With content store provided, all values go through the store
      expect(traceEvents[0].response).toHaveProperty('$ref');
      const storedResponse = await contentStore.get(traceEvents[0].response.$ref);
      expect(storedResponse).toBe('short response');
    });

    it('truncates large payloads without content store', async () => {
      const events = [];
      const longPrompt = 'y'.repeat(1000);
      mockFetch.mockResolvedValueOnce(makeApiResponse('ok'));

      await callLlm(longPrompt, {
        onProgress: (e) => events.push(e),
        operation: 'test',
        promptTrace: true,
      });

      const traceEvents = events.filter((e) => e.event === DomainEvent.promptTrace);
      expect(traceEvents).toHaveLength(1);

      // Without content store, large strings get truncated
      expect(traceEvents[0].prompt).toEqual({
        truncated: true,
        preview: 'y'.repeat(500),
        length: 1000,
      });
    });

    it('propagates original LLM error when content store throws during error trace', async () => {
      const events = [];
      const brokenStore = {
        async get() { throw new Error('store read failed'); },
        async set() { throw new Error('store write failed'); },
        async has() { return false; },
        async delete() { return false; },
        size() { return 0; },
        clear() {},
      };

      mockFetch.mockResolvedValueOnce(
        makeErrorResponse(503, 'overloaded', 'Service temporarily unavailable')
      );

      const error = await callLlm('test prompt', {
        onProgress: (e) => events.push(e),
        operation: 'test',
        promptTrace: true,
        contentStore: brokenStore,
      }).catch((e) => e);

      // The original LLM error propagates, not the store error
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Service temporarily unavailable');
      expect(error.message).not.toContain('store write failed');
      expect(error.httpStatus).toBe(503);

      // No prompt trace emitted since the store threw
      const traceEvents = events.filter((e) => e.event === DomainEvent.promptTrace);
      expect(traceEvents).toHaveLength(0);
    });
  });
});
