import { describe, it, expect } from 'vitest';
import collectEventsWith from './index.js';
import { ChainEvent } from '../progress/constants.js';

describe('collectEventsWith', () => {
  it('captures named fields from events and returns the function result', async () => {
    const [result, captured] = await collectEventsWith((onProgress) => {
      onProgress({ event: 'step', stepName: 'deriving', specification: 'my spec' });
      onProgress({ event: ChainEvent.complete });
      return 'chain-result';
    }, 'specification');

    expect(result).toBe('chain-result');
    expect(captured.specification).toBe('my spec');
  });

  it('captures multiple fields from different events', async () => {
    const [, captured] = await collectEventsWith(
      (onProgress) => {
        onProgress({ event: 'step', specification: 'entity spec' });
        onProgress({ event: 'phase', categories: ['a', 'b', 'c'] });
        onProgress({ event: ChainEvent.complete });
        return undefined;
      },
      'specification',
      'categories'
    );

    expect(captured.specification).toBe('entity spec');
    expect(captured.categories).toEqual(['a', 'b', 'c']);
  });

  it('keeps the last value when a field appears in multiple events', async () => {
    const [, captured] = await collectEventsWith((onProgress) => {
      onProgress({ event: 'step', specification: 'first' });
      onProgress({ event: 'step', specification: 'second' });
      onProgress({ event: ChainEvent.complete });
      return undefined;
    }, 'specification');

    expect(captured.specification).toBe('second');
  });

  it('ignores fields not in the capture list', async () => {
    const [, captured] = await collectEventsWith((onProgress) => {
      onProgress({ event: 'step', specification: 'my spec', other: 'ignored' });
      onProgress({ event: ChainEvent.complete });
      return undefined;
    }, 'specification');

    expect(captured.specification).toBe('my spec');
    expect(captured.other).toBeUndefined();
  });

  it('resolves with empty object when no fields are found', async () => {
    const [, captured] = await collectEventsWith((onProgress) => {
      onProgress({ event: 'step', stepName: 'something' });
      onProgress({ event: ChainEvent.complete });
      return undefined;
    }, 'specification');

    expect(captured).toEqual({});
  });

  it('composes with existing callback inside the wrapper', async () => {
    const events = [];
    const outer = (event) => events.push(event);

    const [, captured] = await collectEventsWith((onProgress) => {
      const composed = (e) => {
        onProgress(e);
        outer(e);
      };
      composed({ event: 'step', specification: 'my spec' });
      composed({ event: ChainEvent.complete });
      return undefined;
    }, 'specification');

    expect(events).toHaveLength(2);
    expect(events[0].specification).toBe('my spec');
    expect(captured.specification).toBe('my spec');
  });

  it('resolves captured on chain error events', async () => {
    const [, captured] = await collectEventsWith((onProgress) => {
      onProgress({ event: 'step', specification: 'partial' });
      onProgress({ event: ChainEvent.error, error: new Error('boom') });
      return undefined;
    }, 'specification');

    expect(captured.specification).toBe('partial');
  });

  it('awaits async function results', async () => {
    const [result, captured] = await collectEventsWith(async (onProgress) => {
      onProgress({ event: 'step', specification: 'async spec' });
      onProgress({ event: ChainEvent.complete });
      return Promise.resolve(42);
    }, 'specification');

    expect(result).toBe(42);
    expect(captured.specification).toBe('async spec');
  });
});
