import { describe, expect, it } from 'vitest';

import createProgressEmitter, { scopePhase } from './index.js';
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
        kind: 'telemetry',
        step: 'filter',
        event: 'chain:start',
        operation: 'filter',
      });
      expect(events[0].timestamp).toBeDefined();
    });

    it('does not throw when callback absent', () => {
      const emitter = createProgressEmitter('test');
      expect(() => emitter.start()).not.toThrow();
    });
  });

  describe('emit', () => {
    it('emits operation events with step and operation pre-filled', () => {
      const events = [];
      const runConfig = nameStep('sort', {});
      const emitter = createProgressEmitter('sort', (e) => events.push(e), runConfig);

      emitter.emit({ event: 'step', stepName: 'sorting-chunk', iteration: 1 });

      expect(events[0]).toMatchObject({
        kind: 'operation',
        step: 'sort',
        event: 'step',
        stepName: 'sorting-chunk',
        iteration: 1,
        operation: 'sort',
      });
    });

    it('always sets kind to operation', () => {
      const events = [];
      const emitter = createProgressEmitter('test', (e) => events.push(e));
      emitter.emit({ event: 'start' });
      expect(events[0].kind).toBe('operation');
    });

    it('computes progress ratio from totalItems and processedItems', () => {
      const events = [];
      const emitter = createProgressEmitter('map', (e) => events.push(e));

      emitter.emit({ event: 'batch:complete', totalItems: 20, processedItems: 10, batchSize: 10 });

      expect(events[0].progress).toBe(0.5);
    });

    it('does not throw when callback absent', () => {
      const emitter = createProgressEmitter('test');
      expect(() => emitter.emit({ event: 'phase', phase: 'discovery' })).not.toThrow();
    });

    it('swallows callback errors', () => {
      const emitter = createProgressEmitter('test', () => {
        throw new Error('boom');
      });
      expect(() => emitter.emit({ event: 'start' })).not.toThrow();
    });
  });

  describe('metrics', () => {
    it('emits telemetry events with step and operation pre-filled', () => {
      const events = [];
      const runConfig = nameStep('llm', { operation: 'filter' });
      const emitter = createProgressEmitter('llm', (e) => events.push(e), runConfig);

      emitter.metrics({ event: 'llm:model', model: 'gpt-4o', source: 'negotiated' });

      expect(events[0]).toMatchObject({
        kind: 'telemetry',
        step: 'llm',
        event: 'llm:model',
        operation: 'filter/llm',
        model: 'gpt-4o',
        source: 'negotiated',
      });
    });

    it('always sets kind to telemetry', () => {
      const events = [];
      const emitter = createProgressEmitter('test', (e) => events.push(e));
      emitter.metrics({ event: 'retry:attempt' });
      expect(events[0].kind).toBe('telemetry');
    });

    it('does not throw when callback absent', () => {
      const emitter = createProgressEmitter('test');
      expect(() => emitter.metrics({ event: 'option:resolve' })).not.toThrow();
    });
  });

  describe('complete', () => {
    it('emits chain:complete with duration from options.now', () => {
      const events = [];
      const now = new Date(Date.now() - 150);
      const runConfig = nameStep('filter', { now });
      const emitter = createProgressEmitter('filter', (e) => events.push(e), runConfig);
      emitter.complete({ totalItems: 10, successCount: 8 });

      const complete = events[0];
      expect(complete).toMatchObject({
        kind: 'telemetry',
        step: 'filter',
        event: 'chain:complete',
        operation: 'filter',
        totalItems: 10,
        successCount: 8,
      });
      expect(complete.duration).toBeGreaterThanOrEqual(150);
    });

    it('uses explicit duration override', () => {
      const events = [];
      const emitter = createProgressEmitter('bool', (e) => events.push(e));
      emitter.complete({ duration: 42 });

      expect(events[0].duration).toBe(42);
    });

    it('omits duration when no now and no explicit', () => {
      const events = [];
      const emitter = createProgressEmitter('bool', (e) => events.push(e));
      emitter.complete({ totalItems: 5 });

      expect(events[0].duration).toBeUndefined();
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
        kind: 'telemetry',
        step: 'map',
        event: 'chain:error',
        operation: 'parent/map',
        error: { message: 'batch failed' },
        totalItems: 20,
      });
      expect(errorEvent.duration).toBeGreaterThanOrEqual(200);
    });

    it('uses explicit duration override', () => {
      const events = [];
      const emitter = createProgressEmitter('bool', (e) => events.push(e));
      emitter.error(new Error('oops'), { duration: 99 });

      expect(events[0].duration).toBe(99);
    });

    it('does not throw when callback absent', () => {
      const emitter = createProgressEmitter('test');
      expect(() => emitter.error(new Error('fail'))).not.toThrow();
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
        kind: 'operation',
        step: 'map',
        event: 'batch:complete',
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

    it('works with absent callback', () => {
      const emitter = createProgressEmitter('test');
      const done = emitter.batch(10);
      expect(() => done(5)).not.toThrow();
      expect(done(5)).toBe(10);
    });
  });
});

describe('scopePhase', () => {
  it('wraps callback to add phase to events', () => {
    const events = [];
    const scoped = scopePhase((e) => events.push(e), 'group:extraction');

    scoped({ step: 'reduce', event: 'start' });

    expect(events[0]).toMatchObject({
      step: 'reduce',
      event: 'start',
      phase: 'group:extraction',
    });
  });

  it('composes nested phases with / separator', () => {
    const events = [];
    const outer = scopePhase((e) => events.push(e), 'group:workflow');
    const inner = scopePhase(outer, 'reduce:extraction');

    inner({ step: 'reduce', event: 'batch:complete' });

    expect(events[0].phase).toBe('group:workflow/reduce:extraction');
  });

  it('preserves inner phase in composition', () => {
    const events = [];
    const scoped = scopePhase((e) => events.push(e), 'timeline:reduce');

    scoped({ step: 'reduce', event: 'start', phase: 'inner:work' });

    expect(events[0].phase).toBe('timeline:reduce/inner:work');
  });

  it('returns undefined when callback is absent', () => {
    expect(scopePhase(undefined, 'test')).toBeUndefined();
    expect(scopePhase(null, 'test')).toBeUndefined();
  });
});
