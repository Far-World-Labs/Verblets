/**
 * Helper for using fake timers in tests with async operations
 *
 * When using vi.useFakeTimers() with default settings, it fakes ALL timer functions
 * including setImmediate, nextTick, queueMicrotask, etc. This breaks Promise resolution
 * and async operations, which causes async test operations (like logging) to hang.
 *
 * This helper configures fake timers to only fake the specific timer functions needed
 * for testing while preserving async operation functionality.
 */

/**
 * Use fake timers that don't break async operations
 *
 * Only fakes: setTimeout, clearTimeout, setInterval, clearInterval, Date
 * Preserves: setImmediate, nextTick, queueMicrotask (needed for Promise resolution)
 *
 * @param {object} vi - Vitest's vi object
 */
export function useSafeFakeTimers(vi) {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
  });
}
