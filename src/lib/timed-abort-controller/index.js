/**
 * A class that extends AbortController to include a timeout.
 *
 * @class
 * @extends AbortController
 *
 * @example
 * const timeoutController = new TimedAbortController(3000); // Set a 3 second timeout
 * const signal = timeoutController.signal;
 * fetch('https://example.com', { signal })
 *   .then(response => response.text())
 *   .then(text => console.error(text))
 *   .catch(err => {
 *     if (err.name === 'AbortError') {
 *       console.error('Fetch operation was aborted');
 *     } else {
 *       console.error('Fetch operation failed', err);
 *     }
 *   });
 * timeoutController.clearTimeout(); // Manually clear the timeout
 */
export default class TimedAbortController extends AbortController {
  /**
   * Creates a new TimedAbortController instance.
   *
   * @param {number} timeout - The time in milliseconds after which to automatically trigger the abort signal.
   */
  constructor(timeout) {
    super();
    this.timeout = timeout;
    this.timeoutId = setTimeout(() => {
      this.abort();
    }, timeout);
  }

  /**
   * Clears the timeout, preventing the abort signal from being automatically triggered.
   */
  clearTimeout() {
    clearTimeout(this.timeoutId);
  }
}
