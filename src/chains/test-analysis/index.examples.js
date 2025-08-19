import { describe, it as vitestIt, expect as vitestExpect } from 'vitest';
import { wrapIt, wrapExpect } from './test-wrappers.js';
import { getConfig } from './config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Test analysis chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Test analysis chain' } })
  : vitestExpect;

// Helper to delay execution
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('test-analysis race condition tests', () => {
  it('test that completes synchronously', () => {
    // This test completes normally before afterAll
    expect(1 + 1).toBe(2);
  });

  it('test with async operation completing after suite-end', async () => {
    // Start an async operation
    const asyncWork = async () => {
      // This delay is intentionally longer than the afterAll delay
      // to trigger the race condition
      await delay(50);
      expect(true).toBe(true);
    };

    // Start the async work but don't await it immediately
    const promise = asyncWork();

    // Do some synchronous work
    expect(2 + 2).toBe(4);

    // Now await the async work - this might complete after suite-end
    await promise;
  });

  it('test with detached async operation', () => {
    // This test starts async work but doesn't await it at all
    // The test-complete event will fire after the test returns

    // Create a promise that resolves after suite-end
    const detachedWork = new Promise((resolve) => {
      setTimeout(() => {
        // This will definitely run after suite-end
        expect(3 + 3).toBe(6);
        resolve();
      }, 200); // Long delay to ensure it runs after suite-end
    });

    // Store promise globally to prevent GC (but don't await it)
    globalThis._detachedWork = detachedWork;

    // Synchronous assertion to pass the test immediately
    expect(3 + 3).toBe(6);

    // Test returns immediately, but async work continues
  });

  it('test with Promise.all racing against suite completion', async () => {
    // Multiple async operations that might complete at different times
    const operations = [
      delay(5).then(() => expect(true).toBe(true)),
      delay(15).then(() => expect(true).toBe(true)),
      delay(25).then(() => expect(true).toBe(true)),
      delay(35).then(() => expect(true).toBe(true)),
    ];

    // Some operations might complete after suite-end
    await Promise.all(operations);
  });

  it('test with microtask queue manipulation', async () => {
    // Use Promise.resolve to schedule microtasks
    let completed = false;

    Promise.resolve()
      .then(() => {
        return delay(20);
      })
      .then(() => {
        completed = true;
      });

    // Quick sync assertion
    expect(4 + 4).toBe(8);

    // Wait just long enough for the race to be interesting
    await delay(15);

    // The completion flag might not be set yet
    // This creates timing-dependent behavior
    if (completed) {
      expect(completed).toBe(true);
    } else {
      // Wait a bit more
      await delay(10);
      expect(completed).toBe(true);
    }
  });
});

describe('test-analysis edge cases', () => {
  const skipIt = config?.aiMode ? it.skip : vitestIt.skip;

  it('test that completes after async delay', async () => {
    await delay(5);

    // This should properly report as passed
    expect(true).toBe(true);
  });

  skipIt('skipped test should not cause race conditions', () => {
    // This test is skipped and should be properly tracked
    expect(true).toBe(false);
  });
});
