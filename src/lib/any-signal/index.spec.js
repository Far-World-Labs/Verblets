import { describe, expect, it } from 'vitest';

import anySignal from './index.js';

describe('anySignal', () => {
  it('returns a signal that is not aborted when no inputs are aborted', () => {
    const ac1 = new AbortController();
    const ac2 = new AbortController();
    const combined = anySignal([ac1.signal, ac2.signal]);
    expect(combined.aborted).toBe(false);
  });

  it('aborts when the first signal is aborted', () => {
    const ac1 = new AbortController();
    const ac2 = new AbortController();
    const combined = anySignal([ac1.signal, ac2.signal]);
    ac1.abort();
    expect(combined.aborted).toBe(true);
  });

  it('aborts when the second signal is aborted', () => {
    const ac1 = new AbortController();
    const ac2 = new AbortController();
    const combined = anySignal([ac1.signal, ac2.signal]);
    ac2.abort();
    expect(combined.aborted).toBe(true);
  });

  it('returns already-aborted signal when an input is pre-aborted', () => {
    const ac1 = new AbortController();
    ac1.abort();
    const ac2 = new AbortController();
    const combined = anySignal([ac1.signal, ac2.signal]);
    expect(combined.aborted).toBe(true);
  });

  it('filters out falsy values from the signals array', () => {
    const ac = new AbortController();
    const combined = anySignal([null, ac.signal, undefined]);
    expect(combined.aborted).toBe(false);
    ac.abort();
    expect(combined.aborted).toBe(true);
  });

  it('handles a single signal', () => {
    const ac = new AbortController();
    const combined = anySignal([ac.signal]);
    ac.abort();
    expect(combined.aborted).toBe(true);
  });

  it('handles empty array', () => {
    const combined = anySignal([]);
    expect(combined.aborted).toBe(false);
  });
});
