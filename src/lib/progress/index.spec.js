import { describe, expect, it } from 'vitest';

import createProgressEmitter from './index.js';
import { nameStep } from '../context/option.js';

describe('createProgressEmitter', () => {
  it('emits chain:start on creation', () => {
    const events = [];
    const callback = (e) => events.push(e);
    const runConfig = nameStep('filter', {});
    createProgressEmitter('filter', callback, runConfig);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: 'telemetry',
      step: 'filter',
      event: 'chain:start',
      operation: 'filter',
    });
  });

  it('does not throw when callback is missing', () => {
    expect(() => createProgressEmitter('test')).not.toThrow();
    expect(() => createProgressEmitter('test', null)).not.toThrow();
    expect(() => createProgressEmitter('test', undefined)).not.toThrow();
  });

  describe('emit', () => {
    it('emits operation events with step and operation pre-filled', () => {
      const events = [];
      const runConfig = nameStep('sort', {});
      const emitter = createProgressEmitter('sort', (e) => events.push(e), runConfig);

      emitter.emit({ event: 'step', stepName: 'sorting-chunk', iteration: 1 });

      const stepEvent = events.find((e) => e.event === 'step');
      expect(stepEvent).toMatchObject({
        kind: 'operation',
        step: 'sort',
        event: 'step',
        stepName: 'sorting-chunk',
        iteration: 1,
        operation: 'sort',
      });
    });

    it('defaults kind to operation', () => {
      const events = [];
      const emitter = createProgressEmitter('test', (e) => events.push(e));
      emitter.emit({ event: 'start' });
      const start = events.find((e) => e.event === 'start');
      expect(start.kind).toBe('operation');
    });

    it('emits batch events with counters and progress ratio', () => {
      const events = [];
      const runConfig = nameStep('map', {});
      const emitter = createProgressEmitter('map', (e) => events.push(e), runConfig);

      emitter.emit({ event: 'start', totalItems: 20, processedItems: 0 });
      emitter.emit({ event: 'batch:complete', totalItems: 20, processedItems: 10, batchSize: 10 });
      emitter.emit({ event: 'complete', totalItems: 20, processedItems: 20 });

      const ops = events.filter((e) => e.kind === 'operation');
      expect(ops).toHaveLength(3);
      expect(ops.map((e) => e.event)).toEqual(['start', 'batch:complete', 'complete']);
      expect(ops[1].progress).toBe(0.5);
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

  describe('result', () => {
    it('emits chain:complete with duration from options.now', () => {
      const events = [];
      const now = new Date(Date.now() - 150);
      const runConfig = nameStep('filter', { now });
      const emitter = createProgressEmitter('filter', (e) => events.push(e), runConfig);
      emitter.result({ totalItems: 10, successCount: 8 });

      const complete = events.find((e) => e.event === 'chain:complete');
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
      emitter.result({ duration: 42 });

      const complete = events.find((e) => e.event === 'chain:complete');
      expect(complete.duration).toBe(42);
    });

    it('does not throw when callback absent', () => {
      const emitter = createProgressEmitter('test');
      expect(() => emitter.result({ items: 5 })).not.toThrow();
    });
  });

  describe('error', () => {
    it('emits chain:error with error message and duration', () => {
      const events = [];
      const now = new Date(Date.now() - 200);
      const runConfig = nameStep('map', { operation: 'parent', now });
      const emitter = createProgressEmitter('map', (e) => events.push(e), runConfig);
      emitter.error(new Error('batch failed'), { totalItems: 20 });

      const errorEvent = events.find((e) => e.event === 'chain:error');
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

      const errorEvent = events.find((e) => e.event === 'chain:error');
      expect(errorEvent.duration).toBe(99);
    });

    it('does not throw when callback absent', () => {
      const emitter = createProgressEmitter('test');
      expect(() => emitter.error(new Error('fail'))).not.toThrow();
    });
  });
});
