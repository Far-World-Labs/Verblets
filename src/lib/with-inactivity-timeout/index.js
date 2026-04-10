/**
 * Wraps an async function with an inactivity timeout.
 * The work function receives an onUpdate callback to reset the timer.
 * An optional hook callback can be provided to intercept updates with context.
 *
 * @param {Function} work - An async function that receives onUpdate and returns a Promise.
 * @param {number} timeoutMs - Time in milliseconds to wait before considering the function inactive.
 * @param {Object} [config] - Configuration options.
 * @param {Function} [config.hook] - Optional callback that receives (input, error) and should call onUpdate
 * @param {AbortSignal} [config.abortSignal] - Optional signal to abort the timeout externally.
 * @returns {Promise} - Resolves or rejects with the result of the work function, or times out on inactivity.
 */
function withInactivityTimeout(work, timeoutMs, config = {}) {
  const { hook, abortSignal } = typeof config === 'function' ? { hook: config } : config;

  let timeoutHandle;
  let finished = false;

  function finish() {
    finished = true;
    clearTimeout(timeoutHandle);
    abortSignal?.removeEventListener('abort', onAbort);
  }

  function resetTimeout() {
    if (finished) return;
    clearTimeout(timeoutHandle);
    timeoutHandle = setTimeout(() => {
      if (!finished) {
        finish();
        rejectPromise(new Error(`Inactivity timeout: no update within ${timeoutMs}ms`));
      }
    }, timeoutMs);
  }

  let resolvePromise, rejectPromise;
  const outerPromise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  // Abort signal support — clean up and reject when signalled
  const onAbort = () => {
    if (!finished) {
      finish();
      const reason = abortSignal?.reason ?? new Error('Aborted');
      if (hook) hook(undefined, reason);
      rejectPromise(reason);
    }
  };

  if (abortSignal?.aborted) {
    onAbort();
    return outerPromise;
  }

  abortSignal?.addEventListener('abort', onAbort, { once: true });

  // Start the timer
  resetTimeout();

  const onUpdate = (input, error) => {
    if (hook) {
      hook(input, error);
    }
    resetTimeout();
  };

  work(onUpdate)
    .then((result) => {
      if (!finished) {
        finish();
        resolvePromise(result);
      }
    })
    .catch((err) => {
      if (!finished) {
        finish();
        rejectPromise(err);
      }
    });

  return outerPromise;
}

export default withInactivityTimeout;
export { withInactivityTimeout };
