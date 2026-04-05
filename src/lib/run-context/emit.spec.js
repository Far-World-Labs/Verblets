import { describe, it, expect } from 'vitest';
import createEmit from './emit.js';

describe('createEmit', () => {
  it('creates a plain progress emitter with standard methods', () => {
    const emit = createEmit('test-automation');
    expect(typeof emit.start).toBe('function');
    expect(typeof emit.emit).toBe('function');
    expect(typeof emit.metrics).toBe('function');
    expect(typeof emit.complete).toBe('function');
    expect(typeof emit.error).toBe('function');
    expect(typeof emit.batch).toBe('function');
  });

  it('forwards events to the onProgress callback', () => {
    const events = [];
    const emit = createEmit('test', { onProgress: (e) => events.push(e) });
    emit.start();
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].step).toBe('test');
    expect(events[0].event).toBe('chain:start');
  });

  it('emit sends operation-kind events to onProgress', () => {
    const events = [];
    const emit = createEmit('test', { onProgress: (e) => events.push(e) });
    emit.emit({ event: 'custom:thing', detail: 42 });
    const custom = events.find((e) => e.event === 'custom:thing');
    expect(custom).toBeDefined();
    expect(custom.detail).toBe(42);
    expect(custom.kind).toBe('event');
  });

  it('batch returns a done callback for progress tracking', () => {
    const events = [];
    const emit = createEmit('test', { onProgress: (e) => events.push(e) });
    const done = emit.batch(10);
    expect(typeof done).toBe('function');
    done(3);
    const batchEvent = events.find((e) => e.event === 'batch:complete');
    expect(batchEvent).toBeDefined();
    expect(batchEvent.processedItems).toBe(3);
    expect(batchEvent.totalItems).toBe(10);
  });
});
