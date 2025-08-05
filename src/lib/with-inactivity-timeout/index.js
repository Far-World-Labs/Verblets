/**
 * Wraps an async function with an inactivity timeout.
 * The work function receives an onUpdate callback to reset the timer.
 * An optional hook callback can be provided to intercept updates with context.
 *
 * @param {Function} work - An async function that receives onUpdate and returns a Promise.
 * @param {number} timeoutMs - Time in milliseconds to wait before considering the function inactive.
 * @param {Function} [hook] - Optional callback that receives (input, error) and should call onUpdate
 * @returns {Promise} - Resolves or rejects with the result of the work function, or times out on inactivity.
 */
function withInactivityTimeout(work, timeoutMs, hook = null) {
  let timeoutHandle;
  let finished = false;

  function resetTimeout() {
    if (finished) return;
    clearTimeout(timeoutHandle);
    timeoutHandle = setTimeout(() => {
      if (!finished) {
        finished = true;
        rejectPromise(new Error(`Inactivity timeout: no update within ${timeoutMs}ms`));
      }
    }, timeoutMs);
  }

  let resolvePromise, rejectPromise;
  const outerPromise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  resetTimeout();

  const onUpdate = (input, error = null) => {
    if (hook) {
      hook(input, error);
    }
    resetTimeout();
  };

  work(onUpdate)
    .then((result) => {
      if (!finished) {
        finished = true;
        clearTimeout(timeoutHandle);
        resolvePromise(result);
      }
    })
    .catch((err) => {
      if (!finished) {
        finished = true;
        clearTimeout(timeoutHandle);
        rejectPromise(err);
      }
    });

  return outerPromise;
}

export default withInactivityTimeout;
export { withInactivityTimeout };
