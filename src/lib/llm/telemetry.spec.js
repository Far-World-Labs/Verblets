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
  LlmStatus,
  OptionSource,
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
    it('emits llm:model telemetry event with model selection', async () => {
      const events = [];
      mockFetch.mockResolvedValueOnce(makeApiResponse('hello'));

      await callLlm('test prompt', {
        onProgress: (e) => events.push(e),
        operation: 'test-chain',
      });

      const modelEvents = events.filter((e) => e.event === TelemetryEvent.llmModel);
      expect(modelEvents).toHaveLength(1);
      expect(modelEvents[0]).toMatchObject({
        kind: Kind.telemetry,
        step: 'llm',
        event: TelemetryEvent.llmModel,
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
        usage: { inputTokens: 20, outputTokens: 10 },
      });
      expect(typeof callEvents[0].durationMs).toBe('number');
      expect(callEvents[0].durationMs).toBeGreaterThanOrEqual(0);
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
      expect(typeof callEvents[0].durationMs).toBe('number');
      expect(callEvents[0].error.message).toContain('Rate limit exceeded');
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

      const modelEvent = events.find((e) => e.event === TelemetryEvent.llmModel);
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

      const modelEvent = events.find((e) => e.event === TelemetryEvent.llmModel);
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
        kind: Kind.telemetry,
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
        kind: Kind.telemetry,
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

      const attemptEvents = events.filter((e) => e.event === TelemetryEvent.retryAttempt);
      expect(attemptEvents).toHaveLength(1);
      expect(attemptEvents[0]).toMatchObject({
        kind: Kind.telemetry,
        step: 'test-retry',
        event: TelemetryEvent.retryAttempt,
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

      const errorEvents = events.filter((e) => e.event === TelemetryEvent.retryError);
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0]).toMatchObject({
        kind: Kind.telemetry,
        step: 'llm-call',
        event: TelemetryEvent.retryError,
        operation: 'score',
        attemptNumber: 1,
        error: {
          message: 'Too many requests',
          httpStatus: 429,
          type: 'rate_limit_error',
        },
      });
      expect(typeof errorEvents[0].delay).toBe('number');
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

      const exhaustEvents = events.filter((e) => e.event === TelemetryEvent.retryExhaust);
      expect(exhaustEvents).toHaveLength(1);
      expect(exhaustEvents[0]).toMatchObject({
        kind: Kind.telemetry,
        step: 'failing',
        event: TelemetryEvent.retryExhaust,
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

      const attemptEvents = events.filter((e) => e.event === TelemetryEvent.retryAttempt);
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
      const resolveEvents = events.filter((e) => e.event === TelemetryEvent.optionResolve);
      expect(resolveEvents).toHaveLength(1);
      expect(resolveEvents[0]).toMatchObject({
        kind: Kind.telemetry,
        step: 'temperature',
        event: TelemetryEvent.optionResolve,
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
      const resolveEvents = events.filter((e) => e.event === TelemetryEvent.optionResolve);
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
      const resolveEvents = events.filter((e) => e.event === TelemetryEvent.optionResolve);
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
});
