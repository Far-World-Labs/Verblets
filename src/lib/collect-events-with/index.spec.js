import { describe, it, expect } from 'vitest';
import collectEventsWith from './index.js';
import { ChainEvent } from '../progress/constants.js';

describe('collectEventsWith', () => {
  it('captures named fields from events', async () => {
    const onProgress = collectEventsWith('specification');

    onProgress({ event: 'step', stepName: 'deriving', specification: 'my spec' });
    onProgress({ event: ChainEvent.complete });

    const derived = await onProgress.captured;
    expect(derived.specification).toBe('my spec');
  });

  it('captures multiple fields from different events', async () => {
    const onProgress = collectEventsWith('specification', 'categories');

    onProgress({ event: 'step', specification: 'entity spec' });
    onProgress({ event: 'phase', categories: ['a', 'b', 'c'] });
    onProgress({ event: ChainEvent.complete });

    const derived = await onProgress.captured;
    expect(derived.specification).toBe('entity spec');
    expect(derived.categories).toEqual(['a', 'b', 'c']);
  });

  it('keeps the last value when a field appears in multiple events', async () => {
    const onProgress = collectEventsWith('specification');

    onProgress({ event: 'step', specification: 'first' });
    onProgress({ event: 'step', specification: 'second' });
    onProgress({ event: ChainEvent.complete });

    const derived = await onProgress.captured;
    expect(derived.specification).toBe('second');
  });

  it('ignores fields not in the capture list', async () => {
    const onProgress = collectEventsWith('specification');

    onProgress({ event: 'step', specification: 'my spec', other: 'ignored' });
    onProgress({ event: ChainEvent.complete });

    const derived = await onProgress.captured;
    expect(derived.specification).toBe('my spec');
    expect(derived.other).toBeUndefined();
  });

  it('resolves with empty object when no fields are found', async () => {
    const onProgress = collectEventsWith('specification');

    onProgress({ event: 'step', stepName: 'something' });
    onProgress({ event: ChainEvent.complete });

    const derived = await onProgress.captured;
    expect(derived).toEqual({});
  });

  it('composes with existing callback via pipe', async () => {
    const events = [];
    const outer = (event) => events.push(event);

    const composed = collectEventsWith('specification').pipe(outer);

    composed({ event: 'step', specification: 'my spec' });
    composed({ event: ChainEvent.complete });

    // Outer callback received all events
    expect(events).toHaveLength(2);
    expect(events[0].specification).toBe('my spec');

    // Captured still works
    const derived = await composed.captured;
    expect(derived.specification).toBe('my spec');
  });

  it('pipe handles undefined outer callback', async () => {
    const composed = collectEventsWith('specification').pipe(undefined);

    composed({ event: 'step', specification: 'my spec' });
    composed({ event: ChainEvent.complete });

    const derived = await composed.captured;
    expect(derived.specification).toBe('my spec');
  });
});
