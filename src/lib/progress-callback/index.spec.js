import { describe, expect, it } from 'vitest';

import { scopeProgress, batchTracker } from './index.js';

describe('scopeProgress', () => {
  it('adds phase to events passed through', () => {
    const events = [];
    const onProgress = (event) => events.push(event);
    const scoped = scopeProgress(onProgress, 'category-discovery');

    scoped({ step: 'reduce', event: 'start', totalItems: 10 });
    scoped({ step: 'reduce', event: 'complete', totalItems: 10 });

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({
      step: 'reduce',
      event: 'start',
      totalItems: 10,
      phase: 'category-discovery',
    });
    expect(events[1]).toEqual({
      step: 'reduce',
      event: 'complete',
      totalItems: 10,
      phase: 'category-discovery',
    });
  });

  it('returns undefined when no callback provided', () => {
    expect(scopeProgress(undefined, 'scoring')).toBeUndefined();
    expect(scopeProgress(null, 'scoring')).toBeUndefined();
  });

  it('overwrites existing phase field on the event', () => {
    const events = [];
    const onProgress = (event) => events.push(event);
    const scoped = scopeProgress(onProgress, 'enrichment');

    scoped({ step: 'map', event: 'start', phase: 'old-phase' });

    expect(events[0].phase).toBe('enrichment');
  });

  it('preserves all original event fields', () => {
    const events = [];
    const onProgress = (event) => events.push(event);
    const scoped = scopeProgress(onProgress, 'scoring');

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
      phase: 'scoring',
    });
  });
});

describe('batchTracker.scopedProgress', () => {
  it('delegates to scopeProgress with the tracker onProgress', () => {
    const events = [];
    const onProgress = (event) => events.push(event);
    const tracker = batchTracker('map', 10, { onProgress });

    const scoped = tracker.scopedProgress('nested-phase');
    scoped({ step: 'reduce', event: 'start' });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      step: 'reduce',
      event: 'start',
      phase: 'nested-phase',
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
