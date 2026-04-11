/**
 * Minimal debug logging module
 *
 * Logs to stderr only when VERBLETS_DEBUG is set to a truthy value.
 * Uses the isomorphic env module so this works in both Node and browser.
 */
import { get as configGet } from '../config/index.js';

const isDebugEnabled = () => {
  return !!configGet('VERBLETS_DEBUG');
};

export const debug = (...args) => {
  if (isDebugEnabled()) {
    console.error(...args);
  }
};
