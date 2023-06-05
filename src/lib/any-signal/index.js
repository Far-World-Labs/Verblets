/**
 * Creates a new AbortSignal that is triggered when any of the given signals are aborted.
 *
 * @param {AbortSignal[]} signals - An array of AbortSignal instances to listen to.
 * @returns {AbortSignal} - A new AbortSignal that is aborted when any of the input signals are aborted.
 *
 * @example
 * const abortController1 = new AbortController();
 * const abortController2 = new AbortController();
 * const combinedSignal = anySignal([abortController1.signal, abortController2.signal]);
 * fetch('https://example.com', { signal: combinedSignal });
 * abortController1.abort(); // This will abort the fetch operation
 */
export default (signalsInitial) => {
  const signals = signalsInitial.filter((s) => s);

  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', () => {
      controller.abort();
    });
  }
  return controller.signal;
};
