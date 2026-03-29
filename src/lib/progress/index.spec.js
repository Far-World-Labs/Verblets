import { describe, expect, it } from 'vitest';

import createProgressEmitter, { scopePhase, storeContent, traceId, spanId } from './index.js';
import {
  Kind,
  Level,
  StatusCode,
  ChainEvent,
  OpEvent,
  DomainEvent,
  TelemetryEvent,
  ModelSource,
  Metric,
  TokenType,
} from './constants.js';
import { nameStep } from '../context/option.js';

describe('createProgressEmitter', () => {
  it('does not emit chain:start on construction', () => {
    const events = [];
    createProgressEmitter('filter', (e) => events.push(e));
    expect(events).toHaveLength(0);
  });

  it('does not throw when callback is missing', () => {
    expect(() => createProgressEmitter('test')).not.toThrow();
    expect(() => createProgressEmitter('test', null)).not.toThrow();
    expect(() => createProgressEmitter('test', undefined)).not.toThrow();
  });

  describe('start', () => {
    it('emits chain:start telemetry event', () => {
      const events = [];
      const runConfig = nameStep('filter', {});
      const emitter = createProgressEmitter('filter', (e) => events.push(e), runConfig);
      emitter.start();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        kind: Kind.event,
        step: 'filter',
        event: ChainEvent.start,
        operation: 'filter',
        id: runConfig.spanId,
        level: Level.info,
        at: { file: expect.any(String), line: expect.any(Number) },
      });
      expect(events[0].timestamp).toBeDefined();
    });

    it('does not throw when callback absent', () => {
      const emitter = createProgressEmitter('test');
      expect(() => emitter.start()).not.toThrow();
    });
  });

  describe('emit', () => {
    it('emits domain events with step and operation pre-filled', () => {
      const events = [];
      const runConfig = nameStep('sort', {});
      const emitter = createProgressEmitter('sort', (e) => events.push(e), runConfig);

      emitter.emit({ event: DomainEvent.step, stepName: 'sorting-chunk', iteration: 1 });

      expect(events[0]).toMatchObject({
        kind: Kind.event,
        step: 'sort',
        event: DomainEvent.step,
        stepName: 'sorting-chunk',
        iteration: 1,
        operation: 'sort',
        at: { file: expect.any(String), line: expect.any(Number) },
      });
    });

    it('always sets kind to event', () => {
      const events = [];
      const emitter = createProgressEmitter('test', (e) => events.push(e));
      emitter.emit({ event: DomainEvent.phase, phase: 'discovery' });
      expect(events[0].kind).toBe(Kind.event);
    });

    it('does not throw when callback absent', () => {
      const emitter = createProgressEmitter('test');
      expect(() => emitter.emit({ event: DomainEvent.phase, phase: 'discovery' })).not.toThrow();
    });

    it('swallows callback errors', () => {
      const emitter = createProgressEmitter('test', () => {
        throw new Error('boom');
      });
      expect(() => emitter.emit({ event: DomainEvent.phase, phase: 'test' })).not.toThrow();
    });
  });

  describe('progress', () => {
    it('emits operation events with step and operation pre-filled', () => {
      const events = [];
      const runConfig = nameStep('map', {});
      const emitter = createProgressEmitter('map', (e) => events.push(e), runConfig);

      emitter.progress({ event: OpEvent.start, totalItems: 50 });

      expect(events[0]).toMatchObject({
        kind: Kind.operation,
        step: 'map',
        event: OpEvent.start,
        totalItems: 50,
        operation: 'map',
      });
    });

    it('always sets kind to operation', () => {
      const events = [];
      const emitter = createProgressEmitter('test', (e) => events.push(e));
      emitter.progress({ event: OpEvent.start });
      expect(events[0].kind).toBe(Kind.operation);
    });

    it('computes progress ratio from totalItems and processedItems', () => {
      const events = [];
      const emitter = createProgressEmitter('map', (e) => events.push(e));

      emitter.progress({
        event: OpEvent.batchComplete,
        totalItems: 20,
        processedItems: 10,
        batchSize: 10,
      });

      expect(events[0].progress).toBe(0.5);
    });

    it('does not throw when callback absent', () => {
      const emitter = createProgressEmitter('test');
      expect(() => emitter.progress({ event: OpEvent.start })).not.toThrow();
    });
  });

  describe('metrics', () => {
    it('emits telemetry events with step and operation pre-filled', () => {
      const events = [];
      const runConfig = nameStep('llm', { operation: 'filter' });
      const emitter = createProgressEmitter('llm', (e) => events.push(e), runConfig);

      emitter.emit({
        event: DomainEvent.llmModel,
        model: 'gpt-4o',
        source: ModelSource.negotiated,
      });

      expect(events[0]).toMatchObject({
        kind: Kind.event,
        step: 'llm',
        event: DomainEvent.llmModel,
        operation: 'filter/llm',
        model: 'gpt-4o',
        source: ModelSource.negotiated,
      });
    });

    it('always sets kind to telemetry', () => {
      const events = [];
      const emitter = createProgressEmitter('test', (e) => events.push(e));
      emitter.metrics({ event: TelemetryEvent.llmCall });
      expect(events[0].kind).toBe(Kind.telemetry);
    });

    it('does not throw when callback absent', () => {
      const emitter = createProgressEmitter('test');
      expect(() => emitter.metrics({ event: TelemetryEvent.llmCall })).not.toThrow();
    });
  });

  describe('measure', () => {
    it('emits flat dimensional metric with kind telemetry', () => {
      const events = [];
      const emitter = createProgressEmitter('llm', (e) => events.push(e));

      emitter.measure({
        metric: Metric.tokenUsage,
        tokenType: TokenType.input,
        value: 100,
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        kind: Kind.telemetry,
        step: 'llm',
        metric: Metric.tokenUsage,
        tokenType: TokenType.input,
        value: 100,
      });
    });

    it('includes base fields (operation, trace context)', () => {
      const events = [];
      const emitter = createProgressEmitter('llm', (e) => events.push(e), {
        operation: 'score',
        traceId: 'abc123',
        spanId: 'def456',
      });

      emitter.measure({ metric: Metric.llmDuration, value: 42 });

      expect(events[0]).toMatchObject({
        operation: 'score',
        traceId: 'abc123',
        spanId: 'def456',
      });
    });

    it('does not throw when callback absent', () => {
      const emitter = createProgressEmitter('test');
      expect(() => emitter.measure({ metric: Metric.tokenUsage, value: 0 })).not.toThrow();
    });
  });

  describe('complete', () => {
    it('emits chain:complete with durationMs from options.now', () => {
      const events = [];
      const now = new Date(Date.now() - 150);
      const runConfig = nameStep('filter', { now });
      const emitter = createProgressEmitter('filter', (e) => events.push(e), runConfig);
      emitter.complete({ totalItems: 10, successCount: 8 });

      const complete = events[0];
      expect(complete).toMatchObject({
        kind: Kind.event,
        step: 'filter',
        event: ChainEvent.complete,
        operation: 'filter',
        statusCode: StatusCode.ok,
        totalItems: 10,
        successCount: 8,
        id: runConfig.spanId,
        level: Level.info,
        at: { file: expect.any(String), line: expect.any(Number) },
      });
      expect(complete.durationMs).toBeGreaterThanOrEqual(150);
    });

    it('uses explicit durationMs override', () => {
      const events = [];
      const emitter = createProgressEmitter('bool', (e) => events.push(e));
      emitter.complete({ durationMs: 42 });

      expect(events[0].durationMs).toBe(42);
    });

    it('omits durationMs when no now and no explicit', () => {
      const events = [];
      const emitter = createProgressEmitter('bool', (e) => events.push(e));
      emitter.complete({ totalItems: 5 });

      expect(events[0].durationMs).toBeUndefined();
    });

    it('does not throw when callback absent', () => {
      const emitter = createProgressEmitter('test');
      expect(() => emitter.complete({ items: 5 })).not.toThrow();
    });
  });

  describe('error', () => {
    it('emits chain:error with error message and duration', () => {
      const events = [];
      const now = new Date(Date.now() - 200);
      const runConfig = nameStep('map', { operation: 'parent', now });
      const emitter = createProgressEmitter('map', (e) => events.push(e), runConfig);
      emitter.error(new Error('batch failed'), { totalItems: 20 });

      const errorEvent = events[0];
      expect(errorEvent).toMatchObject({
        kind: Kind.event,
        step: 'map',
        event: ChainEvent.error,
        operation: 'parent/map',
        statusCode: StatusCode.error,
        error: { message: 'batch failed', type: 'Error' },
        totalItems: 20,
        id: runConfig.spanId,
        level: Level.error,
        at: { file: expect.any(String), line: expect.any(Number) },
      });
      expect(errorEvent.durationMs).toBeGreaterThanOrEqual(200);
    });

    it('includes stack trace in error shape', () => {
      const events = [];
      const emitter = createProgressEmitter('test', (e) => events.push(e));
      const err = new Error('with stack');
      emitter.error(err);

      expect(events[0].error.stack).toBeDefined();
      expect(events[0].error.stack).toContain('with stack');
      expect(events[0].error.stack).toContain('index.spec.js');
    });

    it('uses explicit durationMs override', () => {
      const events = [];
      const emitter = createProgressEmitter('bool', (e) => events.push(e));
      emitter.error(new Error('oops'), { durationMs: 99 });

      expect(events[0].durationMs).toBe(99);
    });

    it('does not throw when callback absent', () => {
      const emitter = createProgressEmitter('test');
      expect(() => emitter.error(new Error('fail'))).not.toThrow();
    });
  });

  describe('at field', () => {
    it('points to the caller, not emitter internals', () => {
      const events = [];
      const emitter = createProgressEmitter('test', (e) => events.push(e));
      emitter.emit({ event: DomainEvent.step, stepName: 'check-at' });

      const at = events[0].at;
      expect(at).toBeDefined();
      expect(at.file).not.toContain('progress/index.js');
      expect(at.file).not.toContain('lib/logger/');
      expect(at.file).toContain('index.spec');
      expect(at.line).toBeGreaterThan(0);
    });

    it('is present on lifecycle events (start, complete, error)', () => {
      const events = [];
      const runConfig = nameStep('test', {});
      const emitter = createProgressEmitter('test', (e) => events.push(e), runConfig);
      emitter.start();
      emitter.complete();
      emitter.error(new Error('test'));

      for (const event of events) {
        expect(event.at).toBeDefined();
        expect(event.at.file).toBeDefined();
        expect(event.at.line).toBeGreaterThan(0);
      }
    });

    it('is absent on operation and telemetry events', () => {
      const events = [];
      const emitter = createProgressEmitter('test', (e) => events.push(e));
      emitter.progress({ event: OpEvent.start });
      emitter.metrics({ event: TelemetryEvent.llmCall });
      emitter.measure({ metric: Metric.llmDuration, value: 1 });

      for (const event of events) {
        expect(event.at).toBeUndefined();
      }
    });
  });

  describe('batch', () => {
    it('returns a done function that tracks processedItems', () => {
      const events = [];
      const emitter = createProgressEmitter('map', (e) => events.push(e));
      const done = emitter.batch(100);

      done(25);
      done(25);

      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({
        kind: Kind.operation,
        step: 'map',
        event: OpEvent.batchComplete,
        totalItems: 100,
        processedItems: 25,
        batchSize: 25,
        progress: 0.25,
      });
      expect(events[1]).toMatchObject({
        processedItems: 50,
        progress: 0.5,
      });
    });

    it('done returns current processedItems', () => {
      const emitter = createProgressEmitter('filter', () => {});
      const done = emitter.batch(60);

      expect(done(20)).toBe(20);
      expect(done(15)).toBe(35);
      expect(done(25)).toBe(60);
    });

    it('done.count exposes current processedItems without emitting', () => {
      const events = [];
      const emitter = createProgressEmitter('map', (e) => events.push(e));
      const done = emitter.batch(100);

      expect(done.count).toBe(0);
      done(30);
      expect(done.count).toBe(30);
      expect(events).toHaveLength(1);
      done(20);
      expect(done.count).toBe(50);
      expect(events).toHaveLength(2);
    });

    it('works with absent callback', () => {
      const emitter = createProgressEmitter('test');
      const done = emitter.batch(10);
      expect(() => done(5)).not.toThrow();
      expect(done(5)).toBe(10);
      expect(done.count).toBe(10);
    });
  });
  describe('trace context', () => {
    it('propagates traceId, spanId, parentSpanId from nameStep', () => {
      const events = [];
      const root = nameStep('score', {});
      const child = nameStep('filter', root);
      const emitter = createProgressEmitter('filter', (e) => events.push(e), child);

      emitter.start();

      expect(events[0].traceId).toBe(child.traceId);
      expect(events[0].spanId).toBe(child.spanId);
      expect(events[0].parentSpanId).toBe(root.spanId);
      expect(events[0].traceId).toBe(root.traceId); // same trace
      expect(events[0].spanId).not.toBe(root.spanId); // different span
    });

    it('generates unique traceId and spanId per nameStep chain', () => {
      const a = nameStep('score', {});
      const b = nameStep('filter', {});
      expect(a.traceId).not.toBe(b.traceId);
      expect(a.spanId).not.toBe(b.spanId);
    });

    it('omits trace fields when created without nameStep', () => {
      const events = [];
      const emitter = createProgressEmitter('test', (e) => events.push(e));
      emitter.emit({ event: DomainEvent.step });
      expect(events[0].traceId).toBeUndefined();
      expect(events[0].spanId).toBeUndefined();
      expect(events[0].parentSpanId).toBeUndefined();
    });

    it('includes trace context on all event kinds', () => {
      const events = [];
      const config = nameStep('chain', {});
      const emitter = createProgressEmitter('chain', (e) => events.push(e), config);

      emitter.emit({ event: DomainEvent.phase });
      emitter.progress({ event: OpEvent.start });
      emitter.metrics({ event: TelemetryEvent.llmCall });

      for (const e of events) {
        expect(e.traceId).toBe(config.traceId);
        expect(e.spanId).toBe(config.spanId);
      }
    });
  });

  describe('resource identity', () => {
    it('includes libraryName and libraryVersion on all events', () => {
      const events = [];
      const emitter = createProgressEmitter('test', (e) => events.push(e));

      emitter.emit({ event: DomainEvent.step });
      emitter.progress({ event: OpEvent.start });
      emitter.metrics({ event: TelemetryEvent.llmCall });

      for (const e of events) {
        expect(e.libraryName).toBe('verblets');
        expect(e.libraryVersion).toMatch(/^\d+\.\d+\.\d+/);
      }
    });
  });

  describe('id generators', () => {
    it('traceId returns 32 hex chars', () => {
      const id = traceId();
      expect(id).toMatch(/^[0-9a-f]{32}$/);
    });

    it('spanId returns 16 hex chars', () => {
      const id = spanId();
      expect(id).toMatch(/^[0-9a-f]{16}$/);
    });
  });
});

describe('scopePhase', () => {
  it('wraps callback to add phase to events', () => {
    const events = [];
    const scoped = scopePhase((e) => events.push(e), 'group:extraction');

    scoped({ step: 'reduce', event: OpEvent.start });

    expect(events[0]).toMatchObject({
      step: 'reduce',
      event: OpEvent.start,
      phase: 'group:extraction',
    });
  });

  it('composes nested phases with / separator', () => {
    const events = [];
    const outer = scopePhase((e) => events.push(e), 'group:workflow');
    const inner = scopePhase(outer, 'reduce:extraction');

    inner({ step: 'reduce', event: OpEvent.batchComplete });

    expect(events[0].phase).toBe('group:workflow/reduce:extraction');
  });

  it('preserves inner phase in composition', () => {
    const events = [];
    const scoped = scopePhase((e) => events.push(e), 'timeline:reduce');

    scoped({ step: 'reduce', event: OpEvent.start, phase: 'inner:work' });

    expect(events[0].phase).toBe('timeline:reduce/inner:work');
  });

  it('returns undefined when callback is absent', () => {
    expect(scopePhase(undefined, 'test')).toBeUndefined();
    expect(scopePhase(null, 'test')).toBeUndefined();
  });
});

describe('storeContent', () => {
  it('stores value and returns $ref when content store is provided', async () => {
    const store = new Map();
    const contentStore = {
      async set(key, value) { store.set(key, value); },
      async get(key) { return store.get(key); },
    };

    const result = await storeContent(contentStore, 'my-key', 'any value');

    expect(result).toEqual({ $ref: 'my-key' });
    expect(store.get('my-key')).toBe('any value');
  });

  it('stores short strings via content store when present', async () => {
    const store = new Map();
    const contentStore = {
      async set(key, value) { store.set(key, value); },
    };

    const result = await storeContent(contentStore, 'k', 'short');

    expect(result).toEqual({ $ref: 'k' });
  });

  it('truncates large strings when no content store', async () => {
    const longString = 'x'.repeat(600);
    const result = await storeContent(undefined, 'key', longString);

    expect(result).toEqual({
      truncated: true,
      preview: 'x'.repeat(500),
      length: 600,
    });
  });

  it('passes through short strings when no content store', async () => {
    const result = await storeContent(undefined, 'key', 'hello');

    expect(result).toBe('hello');
  });

  it('passes through non-string values when no content store', async () => {
    const obj = { foo: 'bar' };
    const result = await storeContent(undefined, 'key', obj);

    expect(result).toBe(obj);
  });

  it('passes through null content store', async () => {
    const result = await storeContent(null, 'key', 'value');

    expect(result).toBe('value');
  });

  it('handles content store without set method', async () => {
    const result = await storeContent({ get: () => {} }, 'key', 'value');

    expect(result).toBe('value');
  });

  it('propagates error when content store set() throws', async () => {
    const contentStore = {
      async set() { throw new Error('storage full'); },
    };

    await expect(storeContent(contentStore, 'key', 'value')).rejects.toThrow('storage full');
  });
});
