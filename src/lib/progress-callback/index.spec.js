import { describe, expect, it } from 'vitest';

import { scopeProgress, batchTracker, track } from './index.js';
import { nameStep } from '../context/option.js';

describe('scopeProgress', () => {
  it('adds phase to events passed through', () => {
    const events = [];
    const onProgress = (event) => events.push(event);
    const scoped = scopeProgress(onProgress, 'reduce:category-discovery');

    scoped({ step: 'reduce', event: 'start', totalItems: 10 });
    scoped({ step: 'reduce', event: 'complete', totalItems: 10 });

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({
      step: 'reduce',
      event: 'start',
      totalItems: 10,
      phase: 'reduce:category-discovery',
    });
    expect(events[1]).toEqual({
      step: 'reduce',
      event: 'complete',
      totalItems: 10,
      phase: 'reduce:category-discovery',
    });
  });

  it('returns undefined when no callback provided', () => {
    expect(scopeProgress(undefined, 'score:relevance')).toBeUndefined();
    expect(scopeProgress(null, 'score:relevance')).toBeUndefined();
  });

  it('composes nested phases with / separator', () => {
    const events = [];
    const consumer = (event) => events.push(event);

    // Outer orchestrator scopes group
    const outerScoped = scopeProgress(consumer, 'group:assignment');
    // Inner group scopes its reduce call
    const innerScoped = scopeProgress(outerScoped, 'reduce:category-discovery');

    innerScoped({ step: 'reduce', event: 'start' });

    expect(events[0].phase).toBe('group:assignment/reduce:category-discovery');
  });

  it('composes three levels of nesting', () => {
    const events = [];
    const consumer = (event) => events.push(event);

    const level1 = scopeProgress(consumer, 'orchestrator:phase-a');
    const level2 = scopeProgress(level1, 'group:assignment');
    const level3 = scopeProgress(level2, 'reduce:category-discovery');

    level3({ step: 'reduce', event: 'batch:complete', processedItems: 5 });

    expect(events[0].phase).toBe('orchestrator:phase-a/group:assignment/reduce:category-discovery');
    expect(events[0].step).toBe('reduce');
    expect(events[0].processedItems).toBe(5);
  });

  it('preserves all original event fields', () => {
    const events = [];
    const onProgress = (event) => events.push(event);
    const scoped = scopeProgress(onProgress, 'score:edge-ranking');

    scoped({
      step: 'score',
      event: 'batch:complete',
      totalItems: 50,
      processedItems: 25,
      batchNumber: 1,
      customField: 'preserved',
    });

    expect(events[0]).toEqual({
      step: 'score',
      event: 'batch:complete',
      totalItems: 50,
      processedItems: 25,
      batchNumber: 1,
      customField: 'preserved',
      phase: 'score:edge-ranking',
    });
  });
});

describe('batchTracker.scopedProgress', () => {
  it('delegates to scopeProgress with the tracker onProgress', () => {
    const events = [];
    const onProgress = (event) => events.push(event);
    const tracker = batchTracker('map', 10, { onProgress });

    const scoped = tracker.scopedProgress('reduce:refinement');
    scoped({ step: 'reduce', event: 'start' });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      step: 'reduce',
      event: 'start',
      phase: 'reduce:refinement',
    });
  });

  it('returns undefined when tracker has no onProgress', () => {
    const tracker = batchTracker('map', 10);
    expect(tracker.scopedProgress('anything')).toBeUndefined();
  });
});

describe('batchTracker isolation', () => {
  it('independent tracker instances do not leak state', () => {
    const eventsA = [];
    const eventsB = [];
    const onProgressA = (event) => eventsA.push(event);
    const onProgressB = (event) => eventsB.push(event);

    const trackerA = batchTracker('filter', 20, { onProgress: onProgressA });
    const trackerB = batchTracker('map', 10, { onProgress: onProgressB });

    trackerA.start(4, 2);
    trackerB.start(2, 1);

    trackerA.batchDone(0, 5);
    trackerB.batchDone(0, 5);
    trackerA.batchDone(5, 5);

    // Each tracker should only have its own events
    const filterEvents = eventsA.filter((e) => e.step === 'filter');
    const mapEvents = eventsB.filter((e) => e.step === 'map');

    expect(filterEvents.length).toBeGreaterThan(0);
    expect(mapEvents.length).toBeGreaterThan(0);

    // No cross-contamination
    expect(eventsA.every((e) => e.step === 'filter')).toBe(true);
    expect(eventsB.every((e) => e.step === 'map')).toBe(true);

    // Tracker A processed 10 items (two batchDone calls of 5)
    const lastBatchEventA = eventsA.filter((e) => e.event === 'batch:complete').pop();
    expect(lastBatchEventA.processedItems).toBe(10);

    // Tracker B processed 5 items (one batchDone call of 5)
    const lastBatchEventB = eventsB.filter((e) => e.event === 'batch:complete').pop();
    expect(lastBatchEventB.processedItems).toBe(5);
  });
});

describe('batchTracker event sequence', () => {
  it('emits start → batch:complete → complete in order', () => {
    const events = [];
    const onProgress = (event) => events.push(event);
    const tracker = batchTracker('score', 6, { onProgress });

    tracker.start(2, 1);
    tracker.batchDone(0, 3);
    tracker.batchDone(3, 3);
    tracker.complete();

    const eventTypes = events.map((e) => e.event);

    expect(eventTypes).toEqual(['start', 'batch:complete', 'batch:complete', 'complete']);

    // Verify start event
    expect(events[0]).toMatchObject({
      step: 'score',
      event: 'start',
      totalItems: 6,
      totalBatches: 2,
      maxParallel: 1,
    });

    // Verify batch events have incrementing processedItems
    expect(events[1]).toMatchObject({
      step: 'score',
      event: 'batch:complete',
      processedItems: 3,
      batchNumber: 1,
    });
    expect(events[2]).toMatchObject({
      step: 'score',
      event: 'batch:complete',
      processedItems: 6,
      batchNumber: 2,
    });

    // Verify complete event
    expect(events[3]).toMatchObject({
      step: 'score',
      event: 'complete',
      totalItems: 6,
      processedItems: 6,
    });
  });
});

describe('track', () => {
  it('emits chain:start on creation', () => {
    const events = [];
    const config = { onProgress: (e) => events.push(e) };
    const runConfig = nameStep('filter', config);
    track('filter', runConfig);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: 'telemetry',
      step: 'filter',
      event: 'chain:start',
      operation: 'filter',
    });
  });

  it('returns lifecycle handle with result and error', () => {
    const runConfig = nameStep('filter', {});
    const span = track('filter', runConfig);
    expect(typeof span.result).toBe('function');
    expect(typeof span.error).toBe('function');
  });

  it('result emits chain:complete with duration from config.now', () => {
    const events = [];
    const now = new Date(Date.now() - 150);
    const runConfig = nameStep('filter', {
      onProgress: (e) => events.push(e),
      now,
    });
    const span = track('filter', runConfig);
    span.result({ totalItems: 10, successCount: 8 });

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

  it('result uses explicit duration override', () => {
    const events = [];
    const runConfig = nameStep('bool', { onProgress: (e) => events.push(e) });
    const span = track('bool', runConfig);
    span.result({ duration: 42 });

    const complete = events.find((e) => e.event === 'chain:complete');
    expect(complete.duration).toBe(42);
  });

  it('result spreads metadata into the event', () => {
    const events = [];
    const runConfig = nameStep('find', { onProgress: (e) => events.push(e) });
    const span = track('find', runConfig);
    span.result({ inputSize: 3, outputSize: 3, found: true });

    const complete = events.find((e) => e.event === 'chain:complete');
    expect(complete.inputSize).toBe(3);
    expect(complete.outputSize).toBe(3);
    expect(complete.found).toBe(true);
  });

  it('result does not throw when onProgress absent', () => {
    const runConfig = nameStep('test', {});
    const span = track('test', runConfig);
    expect(() => span.result({ items: 5 })).not.toThrow();
  });

  it('error emits chain:error with error message and duration', () => {
    const events = [];
    const now = new Date(Date.now() - 200);
    const runConfig = nameStep('map', {
      onProgress: (e) => events.push(e),
      operation: 'parent',
      now,
    });
    const span = track('map', runConfig);
    span.error(new Error('batch failed'), { totalItems: 20 });

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

  it('error uses explicit duration override', () => {
    const events = [];
    const runConfig = nameStep('bool', { onProgress: (e) => events.push(e) });
    const span = track('bool', runConfig);
    span.error(new Error('oops'), { duration: 99 });

    const errorEvent = events.find((e) => e.event === 'chain:error');
    expect(errorEvent.duration).toBe(99);
    expect(errorEvent.error.message).toBe('oops');
  });

  it('error does not throw when onProgress absent', () => {
    const runConfig = nameStep('test', {});
    const span = track('test', runConfig);
    expect(() => span.error(new Error('fail'))).not.toThrow();
  });

  it('error spreads metadata into the event alongside error', () => {
    const events = [];
    const runConfig = nameStep('reduce', { onProgress: (e) => events.push(e) });
    const span = track('reduce', runConfig);
    span.error(new Error('timeout'), { inputSize: 100, phase: 'merge' });

    const errorEvent = events.find((e) => e.event === 'chain:error');
    expect(errorEvent.inputSize).toBe(100);
    expect(errorEvent.phase).toBe('merge');
    expect(errorEvent.error.message).toBe('timeout');
  });
});
