import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock node-fetch before importing llm
vi.mock('node-fetch', () => ({
  default: vi.fn(),
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
import { nameStep } from '../context/option.js';
import createProgressEmitter from '../progress/index.js';
import { ModelService } from '../../services/llm-model/index.js';
import {
  Kind,
  ChainEvent,
  OpEvent,
  TelemetryEvent,
  LlmStatus,
  Metric,
  TokenType,
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

describe('Telemetry integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getPromptResult.mockResolvedValue({ result: null });
    setPromptResult.mockResolvedValue(undefined);
  });

  describe('simulated chain collecting telemetry and operation events', () => {
    it('collects telemetry and operation events from a simulated chain', async () => {
      const events = [];
      const onProgress = (e) => events.push(e);

      mockFetch.mockResolvedValueOnce(makeApiResponse('chain result'));

      // Simulate a chain: nameStep scopes the operation, createProgressEmitter emits chain:start, then callLlm runs inside it
      const runConfig = nameStep('mychain', { onProgress, modelService: testMs });
      createProgressEmitter('mychain', runConfig.onProgress, runConfig).start();
      await callLlm('do something useful', runConfig);

      // All events should have timestamp and kind
      for (const event of events) {
        expect(event.timestamp).toBeDefined();
        expect(typeof event.timestamp).toBe('string');
        expect(event.kind).toBeDefined();
      }

      // Separate telemetry from operation events
      const telemetryEvents = events.filter((e) => e.kind === Kind.telemetry);
      const operationEvents = events.filter((e) => e.kind === Kind.operation);

      // chain:start, llm:model, llm:call are all telemetry kind
      expect(telemetryEvents.length).toBeGreaterThanOrEqual(3);
      const telemetryEventNames = telemetryEvents.map((e) => e.event);
      expect(telemetryEventNames).toContain(ChainEvent.start);
      expect(telemetryEventNames).toContain(TelemetryEvent.llmModel);
      expect(telemetryEventNames).toContain(TelemetryEvent.llmCall);

      // Operation events are a separate stream (none expected from this simple flow,
      // but the separation mechanism works)
      expect(operationEvents.every((e) => e.kind === Kind.operation)).toBe(true);
    });
  });

  describe('nested chain operation paths propagate through telemetry', () => {
    it('child chain inherits parent operation path', async () => {
      const events = [];
      const onProgress = (e) => events.push(e);

      mockFetch.mockResolvedValueOnce(makeApiResponse('nested result'));

      // Parent chain
      const parent = nameStep('parent', { onProgress, modelService: testMs });
      createProgressEmitter('parent', parent.onProgress, parent).start();

      // Child chain receives parent's enriched config
      const child = nameStep('child', parent);
      createProgressEmitter('child', child.onProgress, child).start();

      // Verify chain:start events have correct operation paths
      const chainStarts = events.filter((e) => e.event === ChainEvent.start);
      expect(chainStarts).toHaveLength(2);
      expect(chainStarts[0].operation).toBe('parent');
      expect(chainStarts[1].operation).toBe('parent/child');

      // LLM call inside child chain inherits the nested operation path
      await callLlm('test', child);

      const modelEvent = events.find((e) => e.event === TelemetryEvent.llmModel);
      expect(modelEvent.operation).toBe('parent/child');

      const callEvent = events.find((e) => e.event === TelemetryEvent.llmCall);
      expect(callEvent.operation).toBe('parent/child');
    });
  });

  describe('retry telemetry trail shows full attempt history', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('emits retry:attempt then retry:error then retry:attempt on recovery', async () => {
      const events = [];
      const onProgress = (e) => events.push(e);

      const runConfig = nameStep('retrychain', { onProgress });
      createProgressEmitter('retrychain', runConfig.onProgress, runConfig).start();

      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          const err = new Error('Rate limited');
          err.response = { status: 429 };
          err.httpStatus = 429;
          err.errorType = 'rate_limit_error';
          throw err;
        }
        return 'recovered';
      };

      const promise = retry(fn, {
        label: 'llm-call',
        config: runConfig,
        retryDelay: 100,
        maxAttempts: 3,
      });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('recovered');

      // Extract only retry telemetry events (kind === 'telemetry')
      const retryTelemetry = events.filter(
        (e) =>
          e.kind === Kind.telemetry &&
          [OpEvent.retryAttempt, OpEvent.retryError, OpEvent.retryExhaust].includes(e.event)
      );

      // Expected sequence: attempt(1) → error(1) → attempt(2)
      expect(retryTelemetry).toHaveLength(3);
      expect(retryTelemetry[0]).toMatchObject({
        event: OpEvent.retryAttempt,
        attemptNumber: 1,
      });
      expect(retryTelemetry[1]).toMatchObject({
        event: OpEvent.retryError,
        attemptNumber: 1,
        error: { message: 'Rate limited', httpStatus: 429, type: 'rate_limit_error' },
      });
      expect(retryTelemetry[2]).toMatchObject({
        event: OpEvent.retryAttempt,
        attemptNumber: 2,
      });

      // All retry telemetry events carry the composed operation
      for (const e of retryTelemetry) {
        expect(e.operation).toBe('retrychain');
      }
    });

    it('emits retry:exhaust when all attempts fail', async () => {
      const events = [];
      const onProgress = (e) => events.push(e);

      const runConfig = nameStep('failchain', { onProgress });
      createProgressEmitter('failchain', runConfig.onProgress, runConfig).start();

      const fn = async () => {
        const err = new Error('Server down');
        err.response = { status: 500 };
        err.httpStatus = 500;
        throw err;
      };

      const promise = retry(fn, {
        label: 'doomed',
        config: runConfig,
        retryDelay: 50,
        maxAttempts: 2,
      });
      const settled = promise.catch(() => {});
      await vi.runAllTimersAsync();
      await settled;
      await expect(promise).rejects.toThrow('Server down');

      const retryTelemetry = events.filter(
        (e) =>
          e.kind === Kind.telemetry &&
          [OpEvent.retryAttempt, OpEvent.retryError, OpEvent.retryExhaust].includes(e.event)
      );

      // attempt(1) → error(1) → attempt(2) → exhaust
      expect(retryTelemetry).toHaveLength(4);
      expect(retryTelemetry[0]).toMatchObject({
        event: OpEvent.retryAttempt,
        attemptNumber: 1,
      });
      expect(retryTelemetry[1]).toMatchObject({
        event: OpEvent.retryError,
        attemptNumber: 1,
      });
      expect(retryTelemetry[2]).toMatchObject({
        event: OpEvent.retryAttempt,
        attemptNumber: 2,
      });
      expect(retryTelemetry[3]).toMatchObject({
        event: OpEvent.retryExhaust,
        error: { message: 'Server down', httpStatus: 500 },
      });
    });
  });

  describe('consumer can aggregate tokens across multiple LLM calls', () => {
    it('sums tokens from llm:call telemetry events', async () => {
      const events = [];
      const onProgress = (e) => events.push(e);

      mockFetch
        .mockResolvedValueOnce(
          makeApiResponse('first', { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 })
        )
        .mockResolvedValueOnce(
          makeApiResponse('second', { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 })
        );

      const runConfig = nameStep('aggregate', { onProgress, modelService: testMs });
      createProgressEmitter('aggregate', runConfig.onProgress, runConfig).start();

      await callLlm('prompt one', runConfig);
      await callLlm('prompt two', runConfig);

      const callEvents = events.filter(
        (e) => e.event === TelemetryEvent.llmCall && e.status === LlmStatus.success
      );
      expect(callEvents).toHaveLength(2);

      // Consumer aggregation pattern: sum tokens from flat dimensional metrics
      const tokenEvents = events.filter((e) => e.metric === Metric.tokenUsage);
      const totalInput = tokenEvents
        .filter((e) => e.tokenType === TokenType.input)
        .reduce((sum, e) => sum + e.value, 0);
      expect(totalInput).toBe(70);

      const totalOutput = tokenEvents
        .filter((e) => e.tokenType === TokenType.output)
        .reduce((sum, e) => sum + e.value, 0);
      expect(totalOutput).toBe(35);
    });
  });
});
