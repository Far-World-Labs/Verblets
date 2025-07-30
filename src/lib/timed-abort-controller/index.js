/**
 * A class that extends AbortController to include a timeout.
 *
 * This class automatically aborts the signal after a specified timeout period,
 * which is useful for implementing request timeouts in fetch operations.
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

// Use the global AbortController to ensure compatibility across environments
// In browsers, this uses the native AbortController
// In Node.js, this uses the polyfilled AbortController
const BaseController =
  (typeof globalThis !== 'undefined' && globalThis.AbortController) || AbortController;

export default class TimedAbortController extends BaseController {
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
