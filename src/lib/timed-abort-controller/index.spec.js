import { afterEach, describe, expect, it, vi } from 'vitest';

import TimedAbortController from './index.js';

describe('TimedAbortController', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is an AbortController', () => {
    const tac = new TimedAbortController(5000);
    expect(tac).toBeInstanceOf(AbortController);
    expect(tac.signal).toBeDefined();
    tac.clearTimeout();
  });

  it('aborts after the specified timeout', () => {
    vi.useFakeTimers();
    const tac = new TimedAbortController(100);
    expect(tac.signal.aborted).toBe(false);
    vi.advanceTimersByTime(100);
    expect(tac.signal.aborted).toBe(true);
  });

  it('does not abort before the timeout', () => {
    vi.useFakeTimers();
    const tac = new TimedAbortController(200);
    vi.advanceTimersByTime(199);
    expect(tac.signal.aborted).toBe(false);
    tac.clearTimeout();
  });

  it('clearTimeout prevents automatic abort', () => {
    vi.useFakeTimers();
    const tac = new TimedAbortController(100);
    tac.clearTimeout();
    vi.advanceTimersByTime(200);
    expect(tac.signal.aborted).toBe(false);
  });

  it('stores the timeout value', () => {
    const tac = new TimedAbortController(3000);
    expect(tac.timeout).toBe(3000);
    tac.clearTimeout();
  });

  it('can be manually aborted before timeout', () => {
    vi.useFakeTimers();
    const tac = new TimedAbortController(5000);
    tac.abort();
    expect(tac.signal.aborted).toBe(true);
    tac.clearTimeout();
  });
});
